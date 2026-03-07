import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/useAuthStore';
import { Bell, User } from 'lucide-react';

export default function DashboardLayout() {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between border-b border-gray-200 bg-white px-8 shrink-0 relative z-10 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800">
                        Welcome back, {user?.email.split('@')[0]}
                    </h2>
                    <div className="flex items-center gap-6">
                        <button className="text-gray-400 hover:text-indigo-600 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm">
                                <User size={16} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 capitalize">
                                {user?.role || 'Student'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content passed from Routing */}
                <main className="flex-1 overflow-auto bg-gray-50/50 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
