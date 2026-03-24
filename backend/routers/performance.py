from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import csv
from io import StringIO
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx
from config import settings
from auth import require_current_user, require_role

router = APIRouter(tags=["Performance"])

# ── Role shortcuts ───────────────────────────────────────
_staff_only = require_role(models.RoleEnum.teacher, models.RoleEnum.college_admin, models.RoleEnum.system_admin)
_admin_only = require_role(models.RoleEnum.college_admin, models.RoleEnum.system_admin)


# ── Request body models ──────────────────────────────────
class ClientQuery(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID

class StudentPerformanceQuery(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID
    user_id: int

class PerformanceDetailsQuery(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID
    course_id: int
    class_name: str


@router.post("/performance/upload/")
async def upload_performance_csv(file: UploadFile = File(...), client_id: str = Form(settings.DEFAULT_CLIENT_ID), current_user: models.User = Depends(_staff_only)):
    with get_tenant_db_ctx(client_id) as db:
        try:
            content = await file.read()
            csv_reader = csv.DictReader(StringIO(content.decode('utf-8')))
            added_count = 0
            skipped_count = 0

            # Build a course title → id lookup cache
            courses = db.query(models.Course).all()
            course_lookup = {c.title.strip().lower(): c.id for c in courses}

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

                # Resolve course_title → course_id
                course_title = row.get("course_title", "").strip()
                course_id = course_lookup.get(course_title.lower())
                if not course_id:
                    skipped_count += 1
                    continue

                assessment_name = row.get("assessment_name", "").strip()
                if not assessment_name:
                    continue

                # Skip duplicates (same student + course + assessment)
                existing = db.query(models.Performance).filter(
                    models.Performance.student_id == profile.user_id,
                    models.Performance.course_id == course_id,
                    models.Performance.assessment_name == assessment_name
                ).first()
                if existing:
                    skipped_count += 1
                    continue

                score = float(row.get("score", 0))
                max_score = float(row.get("max_score", 100))

                perf = models.Performance(
                    student_id=profile.user_id,
                    course_id=course_id,
                    assessment_name=assessment_name,
                    score=score,
                    max_score=max_score
                )
                db.add(perf)
                added_count += 1

            db.commit()
            return {"message": f"Successfully imported {added_count} performance records ({skipped_count} skipped)"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")


@router.post("/students/performance", response_model=List[schemas.Performance])
def get_student_performance(body: StudentPerformanceQuery, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    if current_user.role not in (models.RoleEnum.college_admin, models.RoleEnum.system_admin) and current_user.id != body.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this student's performance")
    user = db.query(models.User).filter(models.User.id == body.user_id).first()
    if user and user.role in (models.RoleEnum.college_admin, models.RoleEnum.system_admin):
        return db.query(models.Performance).limit(100).all()
    return db.query(models.Performance).filter(models.Performance.student_id == body.user_id).all()


@router.post("/performance/summary", response_model=List[schemas.CoursePerformanceSummary])
def get_performance_summary(body: ClientQuery, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    class_totals_subq = db.query(
        models.Profile.class_name,
        func.count(models.Profile.id).label('total_enrolled')
    ).group_by(models.Profile.class_name).subquery()

    records = db.query(
        models.Profile.class_name,
        models.Course.id.label('course_id'),
        models.Course.title.label('course_name'),
        func.avg(models.Performance.score).label('average_score'),
        func.count(models.Performance.id).label('student_count'),
        class_totals_subq.c.total_enrolled
    ).select_from(models.Performance).join(
        models.Profile, models.Performance.student_id == models.Profile.user_id
    ).join(
        models.Course, models.Performance.course_id == models.Course.id
    ).outerjoin(
        class_totals_subq, models.Profile.class_name == class_totals_subq.c.class_name
    ).group_by(
        models.Profile.class_name, models.Course.id, models.Course.title,
        class_totals_subq.c.total_enrolled
    ).all()

    return [{
        "class_name": r.class_name, "course_id": r.course_id, "course_name": r.course_name,
        "average_score": round(float(r.average_score or 0.0), 2),
        "student_count": r.student_count or 0, "enrolled_students": r.total_enrolled or 0
    } for r in records]


@router.post("/performance/details", response_model=List[schemas.StudentPerformanceDetail])
def get_performance_details(body: PerformanceDetailsQuery, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    records = db.query(
        models.Performance.id.label('id'),
        models.User.id.label('user_id'),
        models.Profile.admission_id, models.Profile.first_name, models.Profile.last_name,
        models.Performance.assessment_name, models.Performance.score, models.Performance.max_score
    ).select_from(models.Performance).join(
        models.User, models.Performance.student_id == models.User.id
    ).join(
        models.Profile, models.User.id == models.Profile.user_id
    ).filter(
        models.Performance.course_id == body.course_id,
        models.Profile.class_name == body.class_name
    ).all()

    return [{
        "id": r.id, "user_id": r.user_id, "admission_id": r.admission_id,
        "first_name": r.first_name, "last_name": r.last_name,
        "assessment_name": r.assessment_name, "score": r.score, "max_score": r.max_score
    } for r in records]


class BulkDeleteRequest(BaseModel):
    client_id: str
    ids: list[int]


@router.post("/performance/bulk-delete/")
def bulk_delete_performance_records(payload: BulkDeleteRequest, current_user: models.User = Depends(_admin_only)):
    with get_tenant_db_ctx(payload.client_id) as db:
        deleted = db.query(models.Performance).filter(
            models.Performance.id.in_(payload.ids)
        ).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully deleted {deleted} performance record(s)"}


class PerformanceRecordUpdate(BaseModel):
    client_id: str
    assessment_name: str | None = None
    score: float | None = None
    max_score: float | None = None


@router.put("/performance/record/{record_id}")
def update_performance_record(record_id: int, payload: PerformanceRecordUpdate, current_user: models.User = Depends(_staff_only)):
    with get_tenant_db_ctx(payload.client_id) as db:
        perf = db.query(models.Performance).filter(models.Performance.id == record_id).first()
        if not perf:
            raise HTTPException(status_code=404, detail="Performance record not found")
        if payload.assessment_name is not None:
            perf.assessment_name = payload.assessment_name
        if payload.score is not None:
            perf.score = payload.score
        if payload.max_score is not None:
            perf.max_score = payload.max_score
        db.commit()
        db.refresh(perf)
        return perf


@router.delete("/performance/record/{record_id}")
def delete_single_performance_record(record_id: int, client_id: str = "", current_user: models.User = Depends(_admin_only)):
    with get_tenant_db_ctx(client_id) as db:
        perf = db.query(models.Performance).filter(models.Performance.id == record_id).first()
        if not perf:
            raise HTTPException(status_code=404, detail="Performance record not found")
        db.delete(perf)
        db.commit()
        return {"message": "Performance record deleted"}
