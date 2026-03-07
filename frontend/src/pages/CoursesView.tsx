import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { CourseService } from '../services/CourseService';
import type { Course } from '../types';

export default function CoursesView() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrolling, setEnrolling] = useState<number | null>(null);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const data = await CourseService.getCourses();
            setCourses(data);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const handleEnroll = async (courseId: number) => {
        if (!user) return;
        setEnrolling(courseId);
        try {
            await CourseService.enrollInCourse(courseId, user.id);
            alert("Successfully enrolled!");
        } catch (error: any) {
            alert(error?.response?.data?.detail || "Failed to enroll");
        } finally {
            setEnrolling(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center">
                        <div className="flex shrink-0 items-center space-x-8">
                            <h1 className="text-xl font-bold text-indigo-600">School ERP</h1>
                            <div className="hidden sm:flex sm:space-x-8">
                                <Link to="/dashboard" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium">
                                    Dashboard
                                </Link>
                                <Link to="/courses" className="border-indigo-500 text-gray-900 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium">
                                    Courses
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                                {user?.role.toUpperCase()}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main>
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Available Courses</h2>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {courses.map((course) => (
                                <div key={course.id} className="overflow-hidden rounded-xl bg-white shadow flex flex-col">
                                    <div className="p-5 flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
                                        <p className="text-gray-500 text-sm">{course.description}</p>
                                    </div>
                                    <div className="bg-gray-50 px-5 py-3 border-t">
                                        <button
                                            onClick={() => handleEnroll(course.id)}
                                            disabled={enrolling === course.id}
                                            className="w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                                        >
                                            {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {courses.length === 0 && (
                                <p className="text-gray-500 col-span-full">No courses available at the moment.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
