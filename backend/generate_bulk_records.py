import random
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def generate_records():
    db = SessionLocal()
    try:
        # Get all students
        students = db.query(models.User).filter(models.User.role == models.RoleEnum.student).all()
        courses = db.query(models.Course).all()

        if not courses:
            print("No courses found. Please run seed_db.py first.")
            return
            
        print(f"Generating data for {len(students)} students and {len(courses)} courses...")

        # Enroll students in 3-5 random courses if not already enrolled
        for student in students:
            existing_enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == student.id).all()
            if not existing_enrollments:
                num_courses = random.randint(3, 5)
                selected_courses = random.sample(courses, k=min(num_courses, len(courses)))
                for course in selected_courses:
                    db.add(models.Enrollment(student_id=student.id, course_id=course.id))
        db.commit()

        print("Enrollments fully populated.")

        # Setup generation parameters
        statuses = ["Present", "Present", "Present", "Present", "Present", "Present", "Present", "Absent", "Late", "Late"]
        today = datetime.date.today()
        
        attendance_records = []
        performance_records = []
        
        enrollments = db.query(models.Enrollment).all()
        
        print("Generating attendance and performance data for all enrollments...")
        assessment_names = ["Midterm Exam", "Final Exam", "Assignment 1", "Assignment 2", "Term Project", "Pop Quiz"]
        
        for enrollment in enrollments: # ~2500 enrollments
            # Attendance: last 30 days
            for i in range(30):
                record_date = today - datetime.timedelta(days=i)
                # Skip weekends
                if record_date.weekday() >= 5:
                    continue
                attendance_records.append(
                    models.Attendance(
                        student_id=enrollment.student_id,
                        course_id=enrollment.course_id,
                        date=record_date,
                        status=random.choice(statuses)
                    )
                )
            
            # Performance: 3 random assessments
            selected_assessments = random.sample(assessment_names, k=3)
            for assessment in selected_assessments:
                max_score = 100.0
                score = round(random.uniform(55.0, 99.0), 2)
                performance_records.append(
                    models.Performance(
                        student_id=enrollment.student_id,
                        course_id=enrollment.course_id,
                        assessment_name=assessment,
                        score=score,
                        max_score=max_score
                    )
                )
                
        # Bulk save logic to avoid memory bloat
        chunk_size = 5000
        for i in range(0, len(attendance_records), chunk_size):
            db.bulk_save_objects(attendance_records[i:i+chunk_size])
            db.commit()
            
        for i in range(0, len(performance_records), chunk_size):
            db.bulk_save_objects(performance_records[i:i+chunk_size])
            db.commit()
            
        print(f"SUCCESS! Inserted {len(attendance_records)} attendance records and {len(performance_records)} performance records.")

    except Exception as e:
        print(f"Error during generation: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_records()
