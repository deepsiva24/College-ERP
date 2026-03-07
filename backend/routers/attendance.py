from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
import csv, datetime
from io import StringIO
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx
from config import settings

router = APIRouter(tags=["Attendance"])


@router.get("/students/{user_id}/attendance", response_model=List[schemas.Attendance])
def get_student_attendance(user_id: int, db: Session = Depends(get_tenant_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.role == models.RoleEnum.admin:
        return db.query(models.Attendance).order_by(models.Attendance.date.desc()).limit(100).all()
    return db.query(models.Attendance).filter(
        models.Attendance.student_id == user_id
    ).order_by(models.Attendance.date.desc()).all()


@router.get("/attendance/summary", response_model=List[schemas.AttendanceSummaryRecord])
def get_attendance_summary(db: Session = Depends(get_tenant_db)):
    records = db.query(
        models.User.id.label('user_id'),
        models.Profile.admission_id,
        models.Profile.first_name,
        models.Profile.last_name,
        models.Profile.class_name,
        models.Profile.section,
        func.count(models.Attendance.id).filter(models.Attendance.status == 'Present').label('total_present'),
        func.count(models.Attendance.id).filter(models.Attendance.status == 'Absent').label('total_absent'),
        func.count(models.Attendance.id).filter(models.Attendance.status == 'Late').label('total_late')
    ).select_from(models.User).join(models.Profile).outerjoin(
        models.Attendance, models.Attendance.student_id == models.User.id
    ).filter(
        models.User.role == models.RoleEnum.student
    ).group_by(
        models.User.id, models.Profile.admission_id, models.Profile.first_name,
        models.Profile.last_name, models.Profile.class_name, models.Profile.section
    ).all()

    return [{
        "user_id": r.user_id, "admission_id": r.admission_id,
        "first_name": r.first_name, "last_name": r.last_name,
        "class_name": r.class_name, "section": r.section,
        "total_present": r.total_present or 0,
        "total_absent": r.total_absent or 0,
        "total_late": r.total_late or 0
    } for r in records]


@router.get("/classes", response_model=List[schemas.ClassSectionInfo])
def get_classes(db: Session = Depends(get_tenant_db)):
    """Get all unique class and section combinations"""
    records = db.query(
        models.Profile.class_name, models.Profile.section
    ).filter(
        models.Profile.class_name != None
    ).distinct().order_by(models.Profile.class_name, models.Profile.section).all()
    return [{"class_name": r.class_name, "section": r.section or "A"} for r in records]


@router.get("/students/by-class", response_model=List[schemas.StudentBasicInfo])
def get_students_by_class(class_name: str, section: str, db: Session = Depends(get_tenant_db)):
    """Get all students in a specific class and section"""
    query = db.query(
        models.User.id.label('user_id'),
        models.Profile.admission_id,
        models.Profile.first_name,
        models.Profile.last_name
    ).select_from(models.User).join(models.Profile).filter(
        models.User.role == models.RoleEnum.student,
        models.Profile.class_name == class_name
    )
    if section:
        query = query.filter(models.Profile.section == section)
    records = query.order_by(models.Profile.first_name, models.Profile.last_name).all()
    return [{"user_id": r.user_id, "admission_id": r.admission_id,
             "first_name": r.first_name, "last_name": r.last_name} for r in records]


@router.post("/attendance/record")
def record_attendance(record: schemas.AttendanceRecordCreate):
    """Record or update attendance for a single student on a specific date"""
    with get_tenant_db_ctx(record.client_id) as db:
        existing = db.query(models.Attendance).filter(
            models.Attendance.student_id == record.student_id,
            models.Attendance.date == record.date
        ).first()
        if existing:
            existing.status = record.status
        else:
            db.add(models.Attendance(
                student_id=record.student_id, date=record.date, status=record.status
            ))
        db.commit()
        return {"message": "Attendance recorded successfully", "status": record.status}


@router.post("/attendance/bulk-upload")
def bulk_upload_attendance(file: UploadFile = File(...), client_id: str = Form(settings.DEFAULT_CLIENT_ID)):
    """Bulk import attendance from a CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    with get_tenant_db_ctx(client_id) as db:
        try:
            content = file.file.read()
            reader = csv.DictReader(StringIO(content.decode('utf-8')))
            records_added = 0
            records_updated = 0
            errors = []

            for row_num, row in enumerate(reader, start=2):
                admission_id = row.get("admission_id")
                date_str = row.get("date")
                status = row.get("status")

                if not admission_id or not date_str or not status:
                    errors.append(f"Row {row_num}: Missing required fields")
                    continue
                if status not in ["Present", "Absent", "Late"]:
                    errors.append(f"Row {row_num}: Invalid status '{status}'")
                    continue
                try:
                    record_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    errors.append(f"Row {row_num}: Invalid date format '{date_str}'")
                    continue

                profile = db.query(models.Profile).filter(models.Profile.admission_id == admission_id).first()
                if not profile:
                    errors.append(f"Row {row_num}: Student '{admission_id}' not found")
                    continue

                existing = db.query(models.Attendance).filter(
                    models.Attendance.student_id == profile.user_id,
                    models.Attendance.date == record_date
                ).first()

                if existing:
                    existing.status = status
                    records_updated += 1
                else:
                    db.add(models.Attendance(student_id=profile.user_id, date=record_date, status=status))
                    records_added += 1

            db.commit()
            return {"message": "Bulk upload processed", "records_added": records_added,
                    "records_updated": records_updated, "errors": errors}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
        finally:
            file.file.close()
