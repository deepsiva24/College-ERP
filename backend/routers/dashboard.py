from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import models
from database import get_tenant_db
from auth import require_current_user
from config import settings

router = APIRouter(tags=["Dashboard"])


class DashboardQuery(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID
    user_id: int


@router.post("/users/dashboard")
def get_dashboard_data(body: DashboardQuery, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    user = db.query(models.User).filter(models.User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_courses = db.query(models.Course).count()
    user_enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == body.user_id
    ).count()

    return {
        "total_courses": total_courses,
        "enrolled_courses": user_enrollments,
        "upcoming_assignments": max(0, user_enrollments * 2)
    }
