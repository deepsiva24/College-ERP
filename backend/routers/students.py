from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
import csv, datetime
from io import StringIO
from sqlalchemy.orm import Session
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx
from auth import hash_password, require_current_user, require_role
from config import settings

router = APIRouter(tags=["Students"])

# ── Role shortcuts ───────────────────────────────────────
_admin_only = require_role(models.RoleEnum.college_admin, models.RoleEnum.system_admin)


# ── Request body models ──────────────────────────────────
class ClientQuery(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID


@router.post("/users/list", response_model=list[schemas.User])
def read_users(body: ClientQuery, skip: int = 0, limit: int = 100, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    return db.query(models.User).offset(skip).limit(limit).all()


@router.post("/students/list/")
def list_students(body: ClientQuery, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    students = db.query(
        models.User.id,
        models.User.email,
        models.Profile.first_name,
        models.Profile.last_name,
        models.Profile.admission_id,
        models.Profile.class_name,
        models.Profile.section
    ).join(
        models.Profile, models.User.id == models.Profile.user_id
    ).filter(
        models.User.role == models.RoleEnum.student
    ).all()
    return [{
        "id": s.id, "email": s.email,
        "first_name": s.first_name, "last_name": s.last_name,
        "admission_id": s.admission_id, "class_name": s.class_name,
        "section": s.section
    } for s in students]


@router.post("/students/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_student(student: schemas.StudentCreate, current_user: models.User = Depends(_admin_only)):
    with get_tenant_db_ctx(student.client_id) as db:
        existing = db.query(models.User).filter(models.User.email == student.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        db_user = models.User(
            email=student.email,
            hashed_password=hash_password(student.password),
            role=models.RoleEnum.student
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        db_profile = models.Profile(
            first_name=student.first_name, last_name=student.last_name,
            phone=student.phone, address=student.address,
            gender=student.gender, date_of_birth=student.date_of_birth,
            admission_id=student.admission_id, class_name=student.class_name,
            branch=student.branch, section=student.section,
            father_name=student.father_name, user_id=db_user.id
        )
        db.add(db_profile)
        db.commit()
        return db_user


@router.post("/students/upload/")
async def upload_students_csv(
    file: UploadFile = File(...),
    client_id: str = Form(settings.DEFAULT_CLIENT_ID),
    current_user: models.User = Depends(_admin_only),
):
    with get_tenant_db_ctx(client_id) as db:
        try:
            content = await file.read()
            csv_reader = csv.DictReader(StringIO(content.decode('utf-8')))
            added_count = 0

            for row in csv_reader:
                email = row.get("email")
                if not email:
                    continue
                existing = db.query(models.User).filter(models.User.email == email).first()
                if existing:
                    continue

                names = row.get("name", "").split(" ", 1)
                first_name = names[0] if len(names) > 0 else ""
                last_name = names[1] if len(names) > 1 else ""

                dob = None
                dob_str = row.get("date_of_birth")
                if dob_str:
                    try:
                        dob = datetime.datetime.strptime(dob_str, "%Y-%m-%d").date()
                    except ValueError:
                        pass

                db_user = models.User(
                    email=email,
                    hashed_password=hash_password("password"),
                    role=models.RoleEnum.student
                )
                db.add(db_user)
                db.flush()

                db.add(models.Profile(
                    first_name=first_name, last_name=last_name,
                    phone=row.get("phone_number"), address=row.get("place"),
                    gender=row.get("gender"), date_of_birth=dob,
                    admission_id=row.get("admission_id"),
                    class_name=row.get("class_name"), branch=row.get("branch"),
                    section=row.get("section"), father_name=row.get("father_name"),
                    photo_url=row.get("photo_url"), user_id=db_user.id
                ))
                added_count += 1

            db.commit()
            return {"message": f"Successfully imported {added_count} students"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")


class BulkDeleteRequest(BaseModel):
    client_id: str
    ids: list[int]


@router.post("/students/bulk-delete/")
def bulk_delete_students(payload: BulkDeleteRequest, current_user: models.User = Depends(_admin_only)):
    with get_tenant_db_ctx(payload.client_id) as db:
        # Delete cascading related records first
        db.query(models.FeeRecord).filter(models.FeeRecord.student_id.in_(payload.ids)).delete(synchronize_session=False)
        db.query(models.Performance).filter(models.Performance.student_id.in_(payload.ids)).delete(synchronize_session=False)
        db.query(models.Attendance).filter(models.Attendance.student_id.in_(payload.ids)).delete(synchronize_session=False)
        db.query(models.Enrollment).filter(models.Enrollment.student_id.in_(payload.ids)).delete(synchronize_session=False)
        db.query(models.Profile).filter(models.Profile.user_id.in_(payload.ids)).delete(synchronize_session=False)
        deleted = db.query(models.User).filter(models.User.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully deleted {deleted} student(s) and all related records"}


class StudentUpdate(BaseModel):
    client_id: str
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    admission_id: str | None = None
    class_name: str | None = None
    section: str | None = None


@router.put("/students/{user_id}")
def update_student(user_id: int, payload: StudentUpdate, current_user: models.User = Depends(_admin_only)):
    with get_tenant_db_ctx(payload.client_id) as db:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")
        profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Student profile not found")
        if payload.email is not None:
            user.email = payload.email
        if payload.first_name is not None:
            profile.first_name = payload.first_name
        if payload.last_name is not None:
            profile.last_name = payload.last_name
        if payload.admission_id is not None:
            profile.admission_id = payload.admission_id
        if payload.class_name is not None:
            profile.class_name = payload.class_name
        if payload.section is not None:
            profile.section = payload.section
        db.commit()
        return {"message": "Student updated successfully"}


@router.delete("/students/{user_id}")
def delete_single_student(user_id: int, client_id: str = "", current_user: models.User = Depends(_admin_only)):
    with get_tenant_db_ctx(client_id) as db:
        db.query(models.FeeRecord).filter(models.FeeRecord.student_id == user_id).delete(synchronize_session=False)
        db.query(models.Performance).filter(models.Performance.student_id == user_id).delete(synchronize_session=False)
        db.query(models.Attendance).filter(models.Attendance.student_id == user_id).delete(synchronize_session=False)
        db.query(models.Enrollment).filter(models.Enrollment.student_id == user_id).delete(synchronize_session=False)
        db.query(models.Profile).filter(models.Profile.user_id == user_id).delete(synchronize_session=False)
        deleted = db.query(models.User).filter(models.User.id == user_id).delete(synchronize_session=False)
        if not deleted:
            raise HTTPException(status_code=404, detail="Student not found")
        db.commit()
        return {"message": "Student and all related records deleted"}
