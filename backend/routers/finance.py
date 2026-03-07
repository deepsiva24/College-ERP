from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx

router = APIRouter(prefix="/finance", tags=["Finance"])


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
