export type RoleEnum = 'student' | 'teacher' | 'college_admin' | 'system_admin';

export interface Profile {
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
}

export interface User {
    id: number;
    client_id?: string;
    email: string;
    role: RoleEnum;
    is_active: boolean;
    profile?: Profile;
}

export interface Course {
    id: number;
    title: string;
    description: string;
    teacher_id: number;
}

export interface Enrollment {
    id: number;
    student_id: number;
    course_id: number;
}
