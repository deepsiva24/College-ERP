import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Award, Target, ArrowLeft, Users, BookOpen } from 'lucide-react';
import { apiClient } from '../api/client';

interface Performance {
    id: number;
    course_id: number;
    assessment_name: string;
    score: number;
    max_score: number;
}

interface CoursePerformanceSummary {
    class_name: string | null;
    course_id: number;
    course_name: string;
    average_score: number;
    student_count: number;
    enrolled_students: number;
}

interface StudentPerformanceDetail {
    user_id: number;
    admission_id: string | null;
    first_name: string;
    last_name: string;
    assessment_name: string;
    score: number;
    max_score: number;
}

export default function PerformanceView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || 'Prahitha Educational';
    const [studentPerformances, setStudentPerformances] = useState<Performance[]>([]);

    // Admin/Teacher States
    const [summaryRecords, setSummaryRecords] = useState<CoursePerformanceSummary[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<CoursePerformanceSummary | null>(null);
    const [detailRecords, setDetailRecords] = useState<StudentPerformanceDetail[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';

    useEffect(() => {
        if (!user) return;

        if (isAdminOrTeacher) {
            apiClient.get(`/performance/summary?client_id=${clientId}`)
                .then(response => {
                    setSummaryRecords(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching performance summary", err);
                    setLoading(false);
                });
        } else {
            apiClient.get(`/students/${user.id}/performance?client_id=${clientId}`)
                .then(response => {
                    setStudentPerformances(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching performance", err);
                    setLoading(false);
                });
        }
    }, [user, isAdminOrTeacher]);

    const openCourseDetails = (course: CoursePerformanceSummary) => {
        setSelectedCourse(course);
        setDetailLoading(true);
        setSearchQuery('');

        // Fetch details for specific class and course
        apiClient.get(`/performance/details`, {
            params: {
                course_id: course.course_id,
                class_name: course.class_name || '',
                client_id: clientId
            }
        })
            .then(response => {
                setDetailRecords(response.data);
                setDetailLoading(false);
            })
            .catch(err => {
                console.error("Error fetching performance details", err);
                setDetailLoading(false);
            });
    };

    const filteredDetails = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return detailRecords;

        return detailRecords.filter(record => {
            const fullName = `${record.first_name} ${record.last_name}`.toLowerCase();
            const adminId = (record.admission_id || '').toLowerCase();
            return fullName.includes(query) || adminId.includes(query);
        });
    }, [detailRecords, searchQuery]);

    if (loading) return <div className="p-8 text-xl font-medium text-gray-600 animate-pulse">Loading academic records...</div>;

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b-4 border-indigo-600 pb-2 inline-block">
                        {isAdminOrTeacher ? 'Academic Performance' : 'My Performance'}
                    </h1>
                    <p className="mt-2 text-gray-600 text-lg">
                        {isAdminOrTeacher ? 'Track average grades by year and drill down into individual student marks.' : 'Track your grades and assessment scores effortlessly.'}
                    </p>
                </div>
            </div>

            {isAdminOrTeacher ? (
                <>
                    {/* Level 1: Summary Cards Grouped by Class + Course */}
                    {!selectedCourse && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {summaryRecords.map((summary, idx) => {
                                // Assume max score is 100 for calculating percentage in summary view.
                                // In a real app we might average the percentages rather than raw scores if max_scores vary wildly.
                                const pct = summary.average_score > 0 ? summary.average_score : 0;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => openCourseDetails(summary)}
                                        className="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-2xl"></div>
                                        <div className="pl-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                                    {summary.class_name || 'Unassigned'}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-1">{summary.course_name}</h3>

                                            <div className="flex items-center gap-2 mt-2 text-gray-500">
                                                <Users size={16} />
                                                <span className="font-medium text-sm">
                                                    Tested: <span className="text-gray-900">{summary.student_count}</span>{' / '}
                                                    Enrolled: <span className="text-gray-900">{summary.enrolled_students}</span>
                                                </span>
                                            </div>

                                            <div className="mt-6 flex items-end justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-1">Average Score</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`text-3xl font-black ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {summary.average_score.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                                    <BookOpen size={24} />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {summaryRecords.length === 0 && (
                                <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                                    <Target size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-xl font-medium">No performance summary data available.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Level 2: Detail Table */}
                    {selectedCourse && (
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedCourse(null)}
                                        className="p-2 bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">{selectedCourse.course_name}</h2>
                                        <p className="text-sm text-gray-500 font-medium">{selectedCourse.class_name || 'Unassigned'} • Detailed Marks</p>
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

                            {detailLoading ? (
                                <div className="p-12 text-center text-gray-500 animate-pulse">Fetching detailed student marks...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                                <th className="p-4 font-semibold">Admission ID</th>
                                                <th className="p-4 font-semibold">Student Name</th>
                                                <th className="p-4 font-semibold">Assessment</th>
                                                <th className="p-4 font-semibold text-right">Score</th>
                                                <th className="p-4 font-semibold text-left">Max</th>
                                                <th className="p-4 font-semibold text-center">Percentage</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredDetails.length > 0 ? filteredDetails.map((record, idx) => {
                                                const pct = record.max_score > 0 ? (record.score / record.max_score) * 100 : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4 font-medium text-gray-900">{record.admission_id || 'N/A'}</td>
                                                        <td className="p-4 text-gray-800 font-medium">{record.first_name} {record.last_name}</td>
                                                        <td className="p-4 text-gray-700">{record.assessment_name}</td>
                                                        <td className="p-4 text-right font-bold text-indigo-700">{Number(record.score.toFixed(2))}</td>
                                                        <td className="p-4 text-left text-gray-500">/ {record.max_score}</td>
                                                        <td className="p-4 text-center font-bold text-gray-900">
                                                            <span className={`px-2 py-1 rounded-md text-sm ${pct >= 75 ? 'bg-green-100 text-green-800' : pct >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                                {pct.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            }) : (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-gray-500">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <Target size={48} className="text-gray-300 mb-4" />
                                                            <p className="text-lg font-medium">No performance records found matching your search.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentPerformances.map((perf) => {
                        const percentage = Math.round((perf.score / perf.max_score) * 100);
                        return (
                            <div key={perf.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{perf.assessment_name}</h3>
                                        <p className="text-sm font-medium text-indigo-600">Course Reference: {perf.course_id}</p>
                                    </div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Award size={24} />
                                    </div>
                                </div>

                                <div className="p-6 bg-gray-50/50 flex-1 flex flex-col justify-center">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-3xl font-extrabold text-gray-900">{Number(perf.score.toFixed(2))}</span>
                                        <span className="text-gray-500 font-medium mb-1">/ {perf.max_score} Points</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-3 mt-4 overflow-hidden">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {studentPerformances.length === 0 && (
                        <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                            <Target size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-xl font-medium">No performance data available yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
