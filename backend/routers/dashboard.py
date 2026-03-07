from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_tenant_db

router = APIRouter(tags=["Dashboard"])


@router.get("/users/{user_id}/dashboard")
def get_dashboard_data(user_id: int, db: Session = Depends(get_tenant_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_courses = db.query(models.Course).count()
    user_enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == user_id
    ).count()

    return {
        "total_courses": total_courses,
        "enrolled_courses": user_enrollments,
        "upcoming_assignments": max(0, user_enrollments * 2)
    }
