from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
import csv
from io import StringIO
from sqlalchemy.orm import Session
import models, schemas
from database import get_tenant_db, get_tenant_db_ctx

router = APIRouter(tags=["Courses"])


@router.get("/courses/", response_model=list[schemas.Course])
def read_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_tenant_db)):
    return db.query(models.Course).offset(skip).limit(limit).all()


@router.post("/courses/", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, teacher_id: int):
    with get_tenant_db_ctx(course.client_id) as db:
        db_course = models.Course(**course.dict(exclude={"client_id"}), teacher_id=teacher_id)
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        return db_course


@router.post("/courses/bulk-upload")
async def bulk_upload_courses(file: UploadFile = File(...), client_id: str = Form("Prahitha Educational")):
    """Bulk import courses from a CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    with get_tenant_db_ctx(client_id) as db:
        try:
            content = await file.read()
            decoded = content.decode('utf-8')
            csv_reader = csv.DictReader(StringIO(decoded))

            default_teacher = db.query(models.User).filter(
                models.User.role.in_([models.RoleEnum.teacher, models.RoleEnum.admin])
            ).first()

            if not default_teacher:
                raise HTTPException(status_code=400, detail="No valid teacher/admin found to assign courses to.")

            records_added = 0
            for row in csv_reader:
                title = row.get("title")
                description = row.get("description", "")
                if not title:
                    continue
                existing = db.query(models.Course).filter(models.Course.title == title).first()
                if existing:
                    continue
                db.add(models.Course(title=title, description=description, teacher_id=default_teacher.id))
                records_added += 1

            db.commit()
            return {"message": f"Successfully imported {records_added} courses."}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")


@router.get("/learning/classes", response_model=List[schemas.ClassCourseGroup])
def get_courses_grouped_by_class(db: Session = Depends(get_tenant_db)):
    courses = db.query(models.Course).all()
    enrollments = db.query(
        models.Enrollment.course_id,
        models.Profile.class_name
    ).join(
        models.User, models.Enrollment.student_id == models.User.id
    ).join(
        models.Profile, models.User.id == models.Profile.user_id
    ).distinct().all()

    materials_db = db.query(models.LearningMaterial).all()

    class_dict = {}
    for e in enrollments:
        cls_name = e.class_name or "Unassigned Default"
        if cls_name not in class_dict:
            class_dict[cls_name] = set()
        class_dict[cls_name].add(e.course_id)

    enrolled_course_ids = {e.course_id for e in enrollments}
    all_course_ids = {c.id for c in courses}
    unassigned_course_ids = all_course_ids - enrolled_course_ids

    if unassigned_course_ids:
        if "Unassigned Default" not in class_dict:
            class_dict["Unassigned Default"] = set()
        class_dict["Unassigned Default"].update(unassigned_course_ids)

    course_map = {}
    for c in courses:
        course_map[c.id] = {
            "id": c.id, "title": c.title, "description": c.description,
            "teacher_id": c.teacher_id, "materials": []
        }

    for m in materials_db:
        if m.course_id in course_map:
            course_map[m.course_id]["materials"].append({
                "id": m.id, "course_id": m.course_id, "title": m.title,
                "material_type": m.material_type, "content_url": m.content_url
            })

    result = []
    sorted_classes = sorted(list(class_dict.keys()), key=lambda x: (x == 'Unassigned Default', x))
    for cls_name in sorted_classes:
        c_ids = class_dict[cls_name]
        grouped_courses = [schemas.CourseWithMaterials(**course_map[cid]) for cid in c_ids if cid in course_map]
        if grouped_courses:
            result.append(schemas.ClassCourseGroup(class_name=cls_name, courses=grouped_courses))

    return result


@router.post("/courses/{course_id}/enroll", response_model=schemas.Enrollment)
def enroll_in_course(course_id: int, student_id: int, client_id: str = "Prahitha Educational"):
    with get_tenant_db_ctx(client_id) as db:
        course = db.query(models.Course).filter(models.Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        existing = db.query(models.Enrollment).filter(
            models.Enrollment.course_id == course_id,
            models.Enrollment.student_id == student_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")
        db_enrollment = models.Enrollment(course_id=course_id, student_id=student_id)
        db.add(db_enrollment)
        db.commit()
        db.refresh(db_enrollment)
        return db_enrollment


@router.get("/courses/{course_id}/materials", response_model=List[schemas.LearningMaterial])
def get_course_materials(course_id: int, db: Session = Depends(get_tenant_db)):
    return db.query(models.LearningMaterial).filter(models.LearningMaterial.course_id == course_id).all()
