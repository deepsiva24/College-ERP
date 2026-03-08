from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime
from enum import Enum
from config import settings

class RoleEnum(str, Enum):
    student = "student"
    teacher = "teacher"
    college_admin = "college_admin"
    system_admin = "system_admin"

class ProfileBase(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    admission_id: Optional[str] = None
    class_name: Optional[str] = None
    branch: Optional[str] = None
    section: Optional[str] = None
    father_name: Optional[str] = None
    photo_url: Optional[str] = None

class ProfileCreate(ProfileBase):
    client_id: str = settings.DEFAULT_CLIENT_ID

class Profile(ProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: str

class CourseCreate(CourseBase):
    client_id: str = settings.DEFAULT_CLIENT_ID

class Course(CourseBase):
    id: int
    teacher_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.student

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    client_id: str = settings.DEFAULT_CLIENT_ID

class UserCreate(UserBase):
    password: str
    client_id: str = settings.DEFAULT_CLIENT_ID

class User(UserBase):
    id: int
    is_active: bool
    profile: Optional[Profile] = None

    class Config:
        from_attributes = True

class Enrollment(BaseModel):
    id: int
    student_id: int
    course_id: int

    class Config:
        from_attributes = True

class Attendance(BaseModel):
    id: int
    student_id: int
    date: date
    status: str

    class Config:
        from_attributes = True

class AttendanceSummaryRecord(BaseModel):
    user_id: int
    admission_id: Optional[str] = None
    first_name: str
    last_name: str
    class_name: Optional[str] = None
    section: Optional[str] = None
    total_present: int
    total_absent: int
    total_late: int

    class Config:
        from_attributes = True

class Performance(BaseModel):
    id: int
    student_id: int
    course_id: int
    assessment_name: str
    score: float
    max_score: float

    class Config:
        from_attributes = True

class CoursePerformanceSummary(BaseModel):
    class_name: Optional[str] = None
    course_id: int
    course_name: str
    average_score: float
    student_count: int
    enrolled_students: int

    class Config:
        from_attributes = True

class StudentPerformanceDetail(BaseModel):
    id: int
    user_id: int
    admission_id: Optional[str] = None
    first_name: str
    last_name: str
    assessment_name: str
    score: float
    max_score: float

    class Config:
        from_attributes = True

class LearningMaterial(BaseModel):
    id: int
    course_id: int
    title: str
    material_type: str
    content_url: str

    class Config:
        from_attributes = True

class CourseWithMaterials(Course):
    materials: List[LearningMaterial] = []

class ClassCourseGroup(BaseModel):
    class_name: str
    courses: List[CourseWithMaterials]

class ClassSectionInfo(BaseModel):
    class_name: str
    section: str

class StudentBasicInfo(BaseModel):
    user_id: int
    admission_id: Optional[str] = None
    first_name: str
    last_name: str

class AttendanceRecordCreate(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID
    student_id: int
    date: date
    status: str

    class Config:
        from_attributes = True

class GalleryItem(BaseModel):
    id: int
    title: str
    image_url: str
    description: Optional[str] = None
    upload_date: datetime

    class Config:
        from_attributes = True

class StudentCreate(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    admission_id: Optional[str] = None
    class_name: Optional[str] = None
    branch: Optional[str] = None
    section: Optional[str] = None
    father_name: Optional[str] = None

class FeeRecordBase(BaseModel):
    term: str
    amount_due: float
    amount_paid: float
    status: str
    due_date: Optional[date] = None

class FeeRecord(FeeRecordBase):
    id: int
    student_id: int
    class Config:
        from_attributes = True

class FeePaymentUpdate(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID
    amount_paid: float

class ClassFeeSummary(BaseModel):
    class_name: str
    total_due: float
    total_paid: float
    student_count: int

class StudentFeeDetail(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    admission_id: Optional[str] = None
    fees: List[FeeRecord]
