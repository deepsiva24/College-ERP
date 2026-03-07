from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Enum, Date, DateTime, Float
import datetime
from sqlalchemy.orm import relationship
import enum
from database import Base

class RoleEnum(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.student)

    profile = relationship("Profile", back_populates="owner", uselist=False)
    enrollments = relationship("Enrollment", back_populates="student")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    admission_id = Column(String, unique=True, index=True, nullable=True)
    class_name = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    section = Column(String, nullable=True)
    father_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="profile")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    teacher_id = Column(Integer, ForeignKey("users.id"))

    enrollments = relationship("Enrollment", back_populates="course")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=datetime.date.today)
    status = Column(String) # "Present", "Absent", "Late"

    student = relationship("User")

class Performance(Base):
    __tablename__ = "performance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    assessment_name = Column(String)
    score = Column(Float)
    max_score = Column(Float)

    student = relationship("User")
    course = relationship("Course")

class LearningMaterial(Base):
    __tablename__ = "learning_materials"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String)
    material_type = Column(String) # "PDF", "Video", "Link"
    content_url = Column(String)

    course = relationship("Course")

class GalleryItem(Base):
    __tablename__ = "gallery_items"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, index=True, default="Prahitha Edu")
    title = Column(String)
    image_url = Column(String)
    description = Column(String, nullable=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)

class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    term = Column(String) # "Term 1", "Term 2", "Term 3"
    amount_due = Column(Float, default=10000.0)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="Pending") # "Pending", "Partial", "Paid"
    due_date = Column(Date, nullable=True)

    student = relationship("User")
