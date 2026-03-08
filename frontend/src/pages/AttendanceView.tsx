import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle2, XCircle, Clock, ArrowLeft, BarChart3, Users, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { getTenantFromUrl } from '../utils/tenant';

// Interfaces for our types based on Backend schemas
interface Attendance {
    id: number;
    student_id: number;
    date: string;
    status: 'Present' | 'Absent' | 'Late';
}

interface AttendanceSummaryRecord {
    user_id: number;
    admission_id: string | null;
    first_name: string;
    last_name: string;
    class_name: string | null;
    section: string | null;
    total_present: number;
    total_absent: number;
    total_late: number;
}

export default function AttendanceView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || getTenantFromUrl() || 'Prahitha Edu';
    const [studentRecords, setStudentRecords] = useState<Attendance[]>([]);
    const [summaryRecords, setSummaryRecords] = useState<AttendanceSummaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    // Modal State for Student Details
    const [selectedStudent, setSelectedStudent] = useState<AttendanceSummaryRecord | null>(null);
    const [studentDetailRecords, setStudentDetailRecords] = useState<Attendance[]>([]);
    const [studentDetailLoading, setStudentDetailLoading] = useState(false);
    const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());

    const isAdminOrTeacher = user?.role === 'college_admin' || user?.role === 'system_admin' || user?.role === 'teacher';

    useEffect(() => {
        if (!user) return;

        if (isAdminOrTeacher) {
            apiClient.get(`/attendance/summary?client_id=${clientId}`)
                .then(response => {
                    setSummaryRecords(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching attendance summary", err);
                    setLoading(false);
                });
        } else {
            apiClient.get(`/students/${user.id}/attendance?client_id=${clientId}`)
                .then(response => {
                    setStudentRecords(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching student attendance", err);
                    setLoading(false);
                });
        }
    }, [user, isAdminOrTeacher]);

    const classStats = useMemo(() => {
        if (!summaryRecords.length) return [];

        const groups: Record<string, { totalPresent: number, totalAbsent: number, totalLate: number, studentCount: number }> = {};

        summaryRecords.forEach(record => {
            const className = record.class_name || 'Unassigned';
            if (!groups[className]) {
                groups[className] = { totalPresent: 0, totalAbsent: 0, totalLate: 0, studentCount: 0 };
            }
            groups[className].totalPresent += record.total_present;
            groups[className].totalAbsent += record.total_absent;
            groups[className].totalLate += record.total_late;
            groups[className].studentCount += 1;
        });

        // Convert to array
        return Object.entries(groups).map(([className, stats]) => {
            const totalDays = stats.totalPresent + stats.totalAbsent + stats.totalLate;
            const percentage = totalDays > 0 ? (stats.totalPresent / totalDays) * 100 : 0;
            return {
                className,
                ...stats,
                percentage
            };
        });
    }, [summaryRecords]);

    const filteredSummary = useMemo(() => {
        let filtered = summaryRecords;

        // If a class is selected, filter by it
        if (selectedClass !== null) {
            filtered = filtered.filter(record => (record.class_name || 'Unassigned') === selectedClass);
        }

        const query = searchQuery.toLowerCase();
        if (query) {
            filtered = filtered.filter(record => {
                const fullName = `${record.first_name} ${record.last_name}`.toLowerCase();
                const adminId = (record.admission_id || '').toLowerCase();
                return fullName.includes(query) || adminId.includes(query);
            });
        }
        return filtered;
    }, [summaryRecords, selectedClass, searchQuery]);

    const openStudentDetails = (student: AttendanceSummaryRecord) => {
        setSelectedStudent(student);
        setStudentDetailLoading(true);
        setCurrentMonthDate(new Date());
        apiClient.get(`/students/${student.user_id}/attendance?client_id=${clientId}`)
            .then(response => {
                setStudentDetailRecords(response.data);
                setStudentDetailLoading(false);
            })
            .catch(err => {
                console.error("Error fetching student attendance", err);
                setStudentDetailLoading(false);
            });
    };

    const renderCalendar = () => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Blank days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10"></div>);
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const record = studentDetailRecords.find(r => r.date === dateStr);

            let bgClass = "bg-white text-gray-700 hover:bg-gray-50 border-gray-100";
            if (record) {
                if (record.status === 'Present') bgClass = "bg-green-50 text-green-800 border-green-200 font-bold shadow-sm";
                else if (record.status === 'Absent') bgClass = "bg-red-50 text-red-800 border-red-200 font-bold shadow-sm";
                else if (record.status === 'Late') bgClass = "bg-yellow-50 text-yellow-800 border-yellow-200 font-bold shadow-sm";
            }

            days.push(
                <div key={d} className="relative flex justify-center w-full">
                    <div
                        className={`w-full h-12 rounded-xl flex items-center justify-center border ${bgClass} transition-colors cursor-default`}
                        title={record ? `${record.status} on ${dateStr}` : `No record for ${dateStr}`}
                    >
                        {d}
                        {record && (
                            <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${record.status === 'Present' ? 'bg-green-500' : record.status === 'Absent' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                    <button
                        onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                        className="p-2 rounded-xl hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h4 className="text-xl font-bold text-gray-800">{monthNames[month]} {year}</h4>
                    <button
                        onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                        className="p-2 rounded-xl hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {days}
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-xl font-medium text-gray-600 animate-pulse">Loading attendance data...</div>;

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b-4 border-indigo-600 pb-2 inline-block">
                        {isAdminOrTeacher ? 'Consolidated Attendance' : 'Attendance Records'}
                    </h1>
                    <p className="mt-2 text-gray-600 text-lg">
                        {isAdminOrTeacher ? 'Overview of student attendance grouped by year and section.' : 'Your daily presence summarized.'}
                    </p>
                </div>

                {!isAdminOrTeacher && (
                    <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg">
                            <CheckCircle2 size={18} />
                            <span className="font-semibold">{studentRecords.filter(r => r.status === 'Present').length} Present</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg">
                            <XCircle size={18} />
                            <span className="font-semibold">{studentRecords.filter(r => r.status === 'Absent').length} Absent</span>
                        </div>
                    </div>
                )}
            </div>

            {isAdminOrTeacher ? (
                <>
                    {/* Level 1: Grouped Classes (Only show if no class is selected) */}
                    {!selectedClass && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {classStats.map((stat, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedClass(stat.className)}
                                    className="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-2xl"></div>
                                    <div className="pl-4">
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{stat.className}</h3>

                                        <div className="flex items-center gap-2 mt-2 text-gray-500">
                                            <Users size={16} />
                                            <span className="font-medium">{stat.studentCount} Students Enrolled</span>
                                        </div>

                                        <div className="mt-6 flex items-end justify-between">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Overall Attendance</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-3xl font-black ${stat.percentage >= 75 ? 'text-green-600' : stat.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {stat.percentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                                <BarChart3 size={24} />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {classStats.length === 0 && (
                                <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                    No class data available.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Level 2: Student Detail View (Only show if a class is selected) */}
                    {selectedClass && (
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => { setSelectedClass(null); setSearchQuery(''); }}
                                        className="p-2 bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">{selectedClass} Details</h2>
                                        <p className="text-sm text-gray-500">{filteredSummary.length} students</p>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by Admission ID or Name..."
                                    className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                            <th className="p-4 font-semibold">Admission ID</th>
                                            <th className="p-4 font-semibold">Name</th>
                                            <th className="p-4 font-semibold">Section</th>
                                            <th className="p-4 font-semibold text-center text-green-700">Present</th>
                                            <th className="p-4 font-semibold text-center text-red-700">Absent</th>
                                            <th className="p-4 font-semibold text-center text-indigo-700">Percentage</th>
                                            <th className="p-4 font-semibold text-center">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSummary.length > 0 ? filteredSummary.map((record, idx) => {
                                            const total = record.total_present + record.total_absent + record.total_late;
                                            const pct = total > 0 ? (record.total_present / total) * 100 : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 font-medium text-gray-900">{record.admission_id || 'N/A'}</td>
                                                    <td className="p-4 text-gray-800 font-medium">{record.first_name} {record.last_name}</td>
                                                    <td className="p-4 text-gray-700">{record.section || '-'}</td>
                                                    <td className="p-4 text-center font-semibold text-green-600">{record.total_present}</td>
                                                    <td className="p-4 text-center font-semibold text-red-600">{record.total_absent}</td>
                                                    <td className="p-4 text-center font-bold text-gray-900">
                                                        <span className={`px-2 py-1 rounded-md text-sm ${pct >= 75 ? 'bg-green-100 text-green-800' : pct >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                            {pct.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => openStudentDetails(record)}
                                                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                                            title="View Calendar"
                                                        >
                                                            <Calendar size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Users size={48} className="text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium">No students found matching your search.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Level 3: Student Details Modal */}
                    {selectedStudent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                                        <p className="text-gray-500 font-medium">Admission ID: {selectedStudent.admission_id || 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedStudent(null)}
                                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <Calendar className="text-indigo-600" /> Recent Attendance History
                                    </h3>

                                    {studentDetailLoading ? (
                                        <div className="py-12 text-center text-gray-500 animate-pulse flex flex-col items-center">
                                            <Calendar className="text-gray-300 w-12 h-12 mb-4" />
                                            Fetching calendar history...
                                        </div>
                                    ) : (
                                        renderCalendar()
                                    )}
                                </div>
                                <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Present</p>
                                            <p className="text-xl font-bold text-green-600">{selectedStudent.total_present}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Absent</p>
                                            <p className="text-xl font-bold text-red-600">{selectedStudent.total_absent}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedStudent(null)}
                                        className="px-6 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                    <ul className="divide-y divide-gray-200/60">
                        {studentRecords.map((record) => (
                            <li key={record.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-600' :
                                        record.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {record.status === 'Present' && <CheckCircle2 size={24} />}
                                        {record.status === 'Absent' && <XCircle size={24} />}
                                        {record.status === 'Late' && <Clock size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{record.date}</h3>
                                        <p className="text-gray-500 font-medium">Daily Record</p>
                                    </div>
                                </div>
                                <div>
                                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${record.status === 'Present' ? 'bg-green-50 border-green-200 text-green-700' :
                                        record.status === 'Absent' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                        }`}>
                                        {record.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                        {studentRecords.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                No attendance records found.
                            </div>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
