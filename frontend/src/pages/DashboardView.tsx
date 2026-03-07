import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DashboardService } from '../services/DashboardService';
import type { DashboardData } from '../services/DashboardService';

export default function DashboardView() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

    useEffect(() => {
        if (user) {
            DashboardService.getDashboardData(user.id)
                .then(setDashboardData)
                .catch(console.error);
        }
    }, [user]);

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
                                <Link to="/dashboard" className="border-indigo-500 text-gray-900 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium">
                                    Dashboard
                                </Link>
                                <Link to="/courses" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium">
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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Dashboard Cards */}
                            <div className="overflow-hidden rounded-xl bg-white shadow">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="truncate text-sm font-medium text-gray-500">Total Courses Available</dt>
                                                <dd className="text-3xl font-semibold tracking-tight text-gray-900">
                                                    {dashboardData ? dashboardData.total_courses : '-'}
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-xl bg-white shadow">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="truncate text-sm font-medium text-gray-500">Enrolled Courses</dt>
                                                <dd className="text-3xl font-semibold tracking-tight text-gray-900">
                                                    {dashboardData ? dashboardData.enrolled_courses : '-'}
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-xl bg-white shadow">
                                <div className="p-5">
                                    <div className="flex items-center">
                                        <div className="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt className="truncate text-sm font-medium text-gray-500">Upcoming Assignments</dt>
                                                <dd className="text-3xl font-semibold tracking-tight text-gray-900">
                                                    {dashboardData ? dashboardData.upcoming_assignments : '-'}
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
