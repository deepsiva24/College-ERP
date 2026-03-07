import { apiClient } from '../api/client';
import type { Course, Enrollment } from '../types';

export class CourseService {
    static async getCourses(): Promise<Course[]> {
        const response = await apiClient.get<Course[]>('/courses/');
        return response.data;
    }

    static async enrollInCourse(courseId: number, studentId: number): Promise<Enrollment> {
        const response = await apiClient.post<Enrollment>(`/courses/${courseId}/enroll?student_id=${studentId}`);
        return response.data;
    }
}
