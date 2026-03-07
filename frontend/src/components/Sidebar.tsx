import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarCheck, TrendingUp, BookOpen, Image, LogOut, UserPlus, IndianRupee } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'teacher', 'student'] },
    { name: 'Record Attendance', href: '/record-attendance', icon: CalendarCheck, roles: ['admin', 'teacher'] },
    { name: 'My Attendance', href: '/attendance', icon: CalendarCheck, roles: ['student'] },
    { name: 'Class Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin', 'teacher'] },
    { name: 'Performance', href: '/performance', icon: TrendingUp, roles: ['admin', 'teacher', 'student'] },
    { name: 'Learning Management', href: '/learning', icon: BookOpen, roles: ['admin', 'teacher', 'student'] },
    { name: 'Gallery', href: '/gallery', icon: Image, roles: ['admin', 'teacher', 'student'] },
    { name: 'Add Students', href: '/add-student', icon: UserPlus, roles: ['admin', 'teacher'] },
    { name: 'Finance', href: '/finance', icon: IndianRupee, roles: ['admin'] },
];

export default function Sidebar() {
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);

    return (
        <div className="flex flex-col w-64 bg-indigo-900 border-r border-indigo-800 text-white shadow-xl h-screen sticky top-0">
            <div className="p-6 flex items-center gap-3 bg-indigo-950/50">
                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center p-1 overflow-hidden">
                    <img src="/logo.png" alt="Gurukul ERP Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold tracking-wide">Gurukul ERP</span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                                : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-white' : 'text-indigo-300'} />
                            <span className="font-medium text-sm">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 bg-indigo-950/30">
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-indigo-200 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium text-sm">Logout</span>
                </button>
            </div>
        </div>
    );
}
