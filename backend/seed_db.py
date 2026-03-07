import random
import datetime
from sqlalchemy.orm import Session
from database import get_tenant_db_ctx
import models
from auth import hash_password

# Constants for Mock Data
DEFAULT_PASSWORD = "password"

SUBJECT_PREFIXES = ["Computer Science", "Mathematics", "Physics", "Literature", "History", "Biology", "Chemistry", "Philosophy"]
COURSE_LEVELS = ["101", "201", "301", "401"]
COURSE_NAMES = ["Intro to", "Advanced", "Principles of", "Applied", "Theory of"]

FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Saanvi", "Aanya", "Aadhya", "Ananya", "Pari", "Diya", "Navya", "Myra", "Sara", "Kiara"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Malhotra", "Singh", "Patel", "Reddy", "Rao", "Kumar", "Iyer"]

ASSESSMENT_NAMES = ["Midterm Exam", "Final Exam", "Quiz 1", "Quiz 2", "Project Presentation"]
MATERIAL_TYPES = ["PDF", "Video", "Link"]

GALLERY_IMAGES = [
    {"title": "Campus Front", "url": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80", "desc": "Main entrance of the campus"},
    {"title": "Library", "url": "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80", "desc": "The central library reading room"},
    {"title": "Graduation Day", "url": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80", "desc": "Class of 2025 graduation ceremony"},
    {"title": "Science Lab", "url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80", "desc": "Advanced chemistry lab"},
    {"title": "Sports Field", "url": "https://images.unsplash.com/photo-1518605368461-1e1e11432da4?auto=format&fit=crop&q=80", "desc": "Annual sports meet on the main field"},
]

def generate_mock_password(base: str) -> str:
    return hash_password(base)


def create_users(db: Session, client_id: str, num_teachers: int, num_students: int):
    print(f"[{client_id}] Creating Administrator...")
    admin_email = f"admin@{client_id.lower().replace(' ', '')}.edu"
    admin = models.User(
        email=admin_email,
        hashed_password=generate_mock_password(DEFAULT_PASSWORD),
        role=models.RoleEnum.admin
    )
    db.add(admin)
    db.flush() 
    db.add(models.Profile(first_name="Admin", last_name="User", user_id=admin.id))

    teachers = []
    print(f"[{client_id}] Creating {num_teachers} Teachers...")
    for i in range(num_teachers):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        teacher = models.User(
            email=f"teacher{i+1}.{fname.lower()}@{client_id.lower().replace(' ', '')}.edu",
            hashed_password=generate_mock_password(DEFAULT_PASSWORD),
            role=models.RoleEnum.teacher
        )
        db.add(teacher)
        db.flush()
        db.add(models.Profile(first_name=fname, last_name=lname, user_id=teacher.id))
        teachers.append(teacher)

    students = []
    print(f"[{client_id}] Creating {num_students} Students...")
    for i in range(num_students):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        student = models.User(
            email=f"student{i+1}.{fname.lower()}@{client_id.lower().replace(' ', '')}.edu",
            hashed_password=generate_mock_password(DEFAULT_PASSWORD),
            role=models.RoleEnum.student
        )
        db.add(student)
        db.flush()
        
        class_year = random.choice(["BSc 1st Year", "BSc 2nd Year", "BSc 3rd Year"])
        section_name = random.choice(["A", "B", "C"])
        admission_id = f"{client_id.upper().replace(' ', '')}-2026-{str(i+1).zfill(4)}"
        
        db.add(models.Profile(
            first_name=fname, 
            last_name=lname, 
            user_id=student.id,
            class_name=class_year,
            section=section_name,
            admission_id=admission_id
        ))
        students.append(student)

    db.commit()
    return admin_email, teachers, students

def create_courses_and_materials(db: Session, client_id: str, teachers: list, num_courses: int):
    print(f"[{client_id}] Creating {num_courses} Courses & Materials...")
    courses = []
    for _ in range(num_courses):
        subject = random.choice(SUBJECT_PREFIXES)
        level = random.choice(COURSE_LEVELS)
        name_prefix = random.choice(COURSE_NAMES)
        
        course = models.Course(
            title=f"{name_prefix} {subject} {level}",
            description=f"A comprehensive study covering all major aspects of {subject.lower()} at the {level} level.",
            teacher_id=random.choice(teachers).id
        )
        db.add(course)
        db.flush()
        courses.append(course)

        # Create Learning Materials for the course
        for m_idx in range(random.randint(2, 5)):
            material = models.LearningMaterial(
                course_id=course.id,
                title=f"{course.title} - Resource {m_idx + 1}",
                material_type=random.choice(MATERIAL_TYPES),
                content_url="https://example.com/resource"
            )
            db.add(material)
    
    db.commit()
    return courses

def create_enrollments_attendance_performance(db: Session, client_id: str, students: list, courses: list, max_courses_per_student: int):
    print(f"[{client_id}] Creating Enrollments, Attendance & Performance Records...")
    today = datetime.date.today()
    
    for student in students:
        num_courses_to_enroll = random.randint(1, max_courses_per_student)
        selected_courses = random.sample(courses, min(num_courses_to_enroll, len(courses)))
        
        for course in selected_courses:
            # 1. Enrollment
            enrollment = models.Enrollment(student_id=student.id, course_id=course.id)
            db.add(enrollment)
            
            # 2. Performance / Grades
            for assessment in random.sample(ASSESSMENT_NAMES, random.randint(2, 4)):
                performance = models.Performance(
                    student_id=student.id,
                    course_id=course.id,
                    assessment_name=assessment,
                    score=random.choice([random.uniform(60, 100), random.uniform(85, 100)]),
                    max_score=100.0
                )
                db.add(performance)
                
        # 3. Daily Attendance for the last 14 days
        for day_offset in range(14):
            status = random.choices(["Present", "Absent", "Late"], weights=[85, 10, 5])[0]
            attendance = models.Attendance(
                student_id=student.id,
                date=today - datetime.timedelta(days=day_offset),
                status=status
            )
            db.add(attendance)
            
    db.commit()

def create_gallery(db: Session, client_id: str):
    print(f"[{client_id}] Creating Gallery Items...")
    for img in GALLERY_IMAGES:
        item = models.GalleryItem(
            title=f"[{client_id.capitalize()}] {img['title']}",
            image_url=img["url"],
            description=img["desc"]
        )
        db.add(item)
    db.commit()

def create_fees(db: Session, client_id: str, students: list):
    print(f"[{client_id}] Creating Fee Records...")
    for student in students:
        for i in range(1, 4):
            status = random.choice(["Pending", "Partial", "Paid"])
            if status == "Paid":
                amount_paid = 10000.0
            elif status == "Partial":
                amount_paid = random.choice([2500.0, 5000.0, 7500.0])
            else:
                amount_paid = 0.0
                
            fee = models.FeeRecord(
                student_id=student.id,
                term=f"Term {i}",
                amount_due=10000.0,
                amount_paid=amount_paid,
                status=status,
                due_date=datetime.date.today() + datetime.timedelta(days=i*30)
            )
            db.add(fee)
    db.commit()

def seed_database():
    print("Initializing Database Seeding...")
    tenants = ["Prahitha Educational", "college_b"]
    for tenant in tenants:
        print(f"Connecting to database for {tenant}...")
        with get_tenant_db_ctx(tenant) as db:
            models.Base.metadata.drop_all(bind=db.get_bind())
            models.Base.metadata.create_all(bind=db.get_bind())
            print(f"Database tables recreated for {tenant}.")
            
            admin_email, teachers, students = create_users(db, client_id=tenant, num_teachers=5, num_students=50)
            courses = create_courses_and_materials(db, client_id=tenant, teachers=teachers, num_courses=15)
            create_enrollments_attendance_performance(db, client_id=tenant, students=students, courses=courses, max_courses_per_student=4)
            create_gallery(db, client_id=tenant)
            create_fees(db, client_id=tenant, students=students)
            print(f"Tenant {tenant} seeded! Test admin login: {admin_email} / {DEFAULT_PASSWORD}")
            
    print("Done. Database successfully populated with synthetic multi-tenant data!")

if __name__ == "__main__":
    seed_database()
