from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import csv, datetime
from io import StringIO
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx
from config import settings

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.post("/upload/")
async def upload_fees_csv(file: UploadFile = File(...), client_id: str = Form(settings.DEFAULT_CLIENT_ID)):
    with get_tenant_db_ctx(client_id) as db:
        try:
            content = await file.read()
            csv_reader = csv.DictReader(StringIO(content.decode('utf-8')))
            added_count = 0
            skipped_count = 0

            for row in csv_reader:
                admission_id = row.get("admission_id", "").strip()
                if not admission_id:
                    continue

                # Resolve admission_id → user_id
                profile = db.query(models.Profile).filter(
                    models.Profile.admission_id == admission_id
                ).first()
                if not profile:
                    skipped_count += 1
                    continue

                term = row.get("term", "").strip()
                if not term:
                    continue

                # Skip duplicates (same student + term)
                existing = db.query(models.FeeRecord).filter(
                    models.FeeRecord.student_id == profile.user_id,
                    models.FeeRecord.term == term
                ).first()
                if existing:
                    skipped_count += 1
                    continue

                # Parse due_date
                due_date = None
                due_date_str = row.get("due_date", "").strip()
                if due_date_str:
                    try:
                        due_date = datetime.datetime.strptime(due_date_str, "%Y-%m-%d").date()
                    except ValueError:
                        pass

                amount_due = float(row.get("amount_due", 0))
                amount_paid = float(row.get("amount_paid", 0))
                status = row.get("status", "Pending").strip()

                fee = models.FeeRecord(
                    student_id=profile.user_id,
                    term=term,
                    amount_due=amount_due,
                    amount_paid=amount_paid,
                    status=status,
                    due_date=due_date
                )
                db.add(fee)
                added_count += 1

            db.commit()
            return {"message": f"Successfully imported {added_count} fee records ({skipped_count} skipped)"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")


@router.get("/summary", response_model=List[schemas.ClassFeeSummary])
def get_finance_summary(db: Session = Depends(get_tenant_db)):
    records = db.query(
        models.Profile.class_name,
        func.sum(models.FeeRecord.amount_due).label("total_due"),
        func.sum(models.FeeRecord.amount_paid).label("total_paid"),
        func.count(func.distinct(models.FeeRecord.student_id)).label("student_count")
    ).select_from(models.FeeRecord).join(
        models.Profile, models.FeeRecord.student_id == models.Profile.user_id
    ).group_by(models.Profile.class_name).all()

    return [{
        "class_name": r.class_name or "Unassigned Default",
        "total_due": r.total_due, "total_paid": r.total_paid,
        "student_count": r.student_count
    } for r in records]


@router.get("/class/{class_name}", response_model=List[schemas.StudentFeeDetail])
def get_class_fee_details(class_name: str, db: Session = Depends(get_tenant_db)):
    if class_name == "Unassigned Default":
        profiles = db.query(models.Profile).filter(models.Profile.class_name == None).all()
    else:
        profiles = db.query(models.Profile).filter(models.Profile.class_name == class_name).all()

    user_ids = [p.user_id for p in profiles]
    fee_records = db.query(models.FeeRecord).filter(models.FeeRecord.student_id.in_(user_ids)).all()

    fees_by_student = {}
    for fee in fee_records:
        fees_by_student.setdefault(fee.student_id, []).append(fee)

    return [{
        "user_id": p.user_id, "first_name": p.first_name, "last_name": p.last_name,
        "admission_id": p.admission_id, "fees": fees_by_student.get(p.user_id, [])
    } for p in profiles]


@router.post("/pay/{fee_record_id}")
def pay_fee(fee_record_id: int, payload: schemas.FeePaymentUpdate):
    with get_tenant_db_ctx(payload.client_id) as db:
        fee = db.query(models.FeeRecord).filter(models.FeeRecord.id == fee_record_id).first()
        if not fee:
            raise HTTPException(status_code=404, detail="Fee record not found")
        fee.amount_paid += payload.amount_paid
        if fee.amount_paid >= fee.amount_due:
            fee.status = "Paid"
            fee.amount_paid = fee.amount_due
        elif fee.amount_paid > 0:
            fee.status = "Partial"
        db.commit()
        db.refresh(fee)
        return fee


class BulkDeleteRequest(BaseModel):
    client_id: str
    ids: list[int]


class FeeRecordUpdate(BaseModel):
    client_id: str
    term: str | None = None
    amount_due: float | None = None
    amount_paid: float | None = None
    status: str | None = None
    due_date: str | None = None


@router.post("/bulk-delete/")
def bulk_delete_fee_records(payload: BulkDeleteRequest):
    with get_tenant_db_ctx(payload.client_id) as db:
        deleted = db.query(models.FeeRecord).filter(
            models.FeeRecord.id.in_(payload.ids)
        ).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully deleted {deleted} fee record(s)"}


@router.put("/record/{record_id}")
def update_fee_record(record_id: int, payload: FeeRecordUpdate):
    with get_tenant_db_ctx(payload.client_id) as db:
        fee = db.query(models.FeeRecord).filter(models.FeeRecord.id == record_id).first()
        if not fee:
            raise HTTPException(status_code=404, detail="Fee record not found")
        if payload.term is not None:
            fee.term = payload.term
        if payload.amount_due is not None:
            fee.amount_due = payload.amount_due
        if payload.amount_paid is not None:
            fee.amount_paid = payload.amount_paid
        if payload.status is not None:
            fee.status = payload.status
        if payload.due_date is not None:
            try:
                fee.due_date = datetime.datetime.strptime(payload.due_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        # Auto-compute status
        if fee.amount_paid >= fee.amount_due:
            fee.status = "Paid"
            fee.amount_paid = fee.amount_due
        elif fee.amount_paid > 0:
            fee.status = "Partial"
        else:
            fee.status = "Pending"
        db.commit()
        db.refresh(fee)
        return fee


@router.delete("/record/{record_id}")
def delete_single_fee_record(record_id: int, client_id: str = ""):
    with get_tenant_db_ctx(client_id) as db:
        fee = db.query(models.FeeRecord).filter(models.FeeRecord.id == record_id).first()
        if not fee:
            raise HTTPException(status_code=404, detail="Fee record not found")
        db.delete(fee)
        db.commit()
        return {"message": "Fee record deleted"}
