from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
import csv, datetime
from io import StringIO
from sqlalchemy.orm import Session
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx
from auth import hash_password

router = APIRouter(tags=["Students"])


@router.get("/users/", response_model=list[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_tenant_db)):
    return db.query(models.User).offset(skip).limit(limit).all()


@router.post("/students/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_student(student: schemas.StudentCreate):
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
async def upload_students_csv(file: UploadFile = File(...), client_id: str = Form("Prahitha Educational")):
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
