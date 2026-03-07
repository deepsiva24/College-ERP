from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
from database import get_tenant_db

router = APIRouter(tags=["Performance"])


@router.get("/students/{user_id}/performance", response_model=List[schemas.Performance])
def get_student_performance(user_id: int, db: Session = Depends(get_tenant_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.role == models.RoleEnum.admin:
        return db.query(models.Performance).limit(100).all()
    return db.query(models.Performance).filter(models.Performance.student_id == user_id).all()


@router.get("/performance/summary", response_model=List[schemas.CoursePerformanceSummary])
def get_performance_summary(db: Session = Depends(get_tenant_db)):
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


@router.get("/performance/details", response_model=List[schemas.StudentPerformanceDetail])
def get_performance_details(course_id: int, class_name: str, db: Session = Depends(get_tenant_db)):
    records = db.query(
        models.User.id.label('user_id'),
        models.Profile.admission_id, models.Profile.first_name, models.Profile.last_name,
        models.Performance.assessment_name, models.Performance.score, models.Performance.max_score
    ).select_from(models.Performance).join(
        models.User, models.Performance.student_id == models.User.id
    ).join(
        models.Profile, models.User.id == models.Profile.user_id
    ).filter(
        models.Performance.course_id == course_id,
        models.Profile.class_name == class_name
    ).all()

    return [{
        "user_id": r.user_id, "admission_id": r.admission_id,
        "first_name": r.first_name, "last_name": r.last_name,
        "assessment_name": r.assessment_name, "score": r.score, "max_score": r.max_score
    } for r in records]
