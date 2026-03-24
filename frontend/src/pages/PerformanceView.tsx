import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Award, Target, ArrowLeft, Users, BookOpen, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getTenantFromUrl } from '../utils/tenant';
import { apiClient } from '../api/client';
import ActionMenu from '../components/ActionMenu';

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
    id: number;
    user_id: number;
    admission_id: string | null;
    first_name: string;
    last_name: string;
    assessment_name: string;
    score: number;
    max_score: number;
}

type PerfSortKey = 'admission_id' | 'name' | 'assessment_name' | 'score' | 'max_score' | 'percentage';
type SortDir = 'asc' | 'desc';

export default function PerformanceView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || getTenantFromUrl() || 'Prahitha Edu';
    const [studentPerformances, setStudentPerformances] = useState<Performance[]>([]);

    // Admin/Teacher States
    const [summaryRecords, setSummaryRecords] = useState<CoursePerformanceSummary[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<CoursePerformanceSummary | null>(null);
    const [detailRecords, setDetailRecords] = useState<StudentPerformanceDetail[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: string; message: string }>({ type: '', message: '' });

    // Edit modal state
    const [editModalRecord, setEditModalRecord] = useState<StudentPerformanceDetail | null>(null);
    const [editForm, setEditForm] = useState({ assessment_name: '', score: '', max_score: '' });
    const [saving, setSaving] = useState(false);

    // Sort state
    const [sortKey, setSortKey] = useState<PerfSortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const toggleSort = (key: PerfSortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: PerfSortKey }) => {
        if (sortKey !== col) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const handlePerformanceUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        setUploading(true);
        setUploadStatus({ type: '', message: '' });

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('client_id', clientId);

        try {
            const response = await apiClient.post('/performance/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadStatus({ type: 'success', message: response.data.message || 'Performance records imported successfully!' });
            setUploadFile(null);
            apiClient.post('/performance/summary', { client_id: clientId })
                .then(response => setSummaryRecords(response.data));
        } catch (error: any) {
            setUploadStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to upload CSV.' });
        } finally {
            setUploading(false);
        }
    };

    const isAdminOrTeacher = user?.role === 'college_admin' || user?.role === 'system_admin' || user?.role === 'teacher';

    useEffect(() => {
        if (!user) return;

        if (isAdminOrTeacher) {
            apiClient.post('/performance/summary', { client_id: clientId })
                .then(response => {
                    setSummaryRecords(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching performance summary", err);
                    setLoading(false);
                });
        } else {
            apiClient.post('/students/performance', { client_id: clientId, user_id: user.id })
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

        apiClient.post('/performance/details', {
            course_id: course.course_id,
            class_name: course.class_name || '',
            client_id: clientId
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

    const refreshDetailData = async () => {
        if (selectedCourse) {
            const res = await apiClient.post('/performance/details', {
                course_id: selectedCourse.course_id, class_name: selectedCourse.class_name || '', client_id: clientId
            });
            setDetailRecords(res.data);
        }
        const summaryRes = await apiClient.post('/performance/summary', { client_id: clientId });
        setSummaryRecords(summaryRes.data);
    };

    const handleDeleteRecord = async (recordId: number) => {
        console.log('[DELETE] Deleting performance record:', recordId);
        // Optimistic: remove from UI immediately
        setDetailRecords(prev => prev.filter(r => r.id !== recordId));
        try {
            await apiClient.delete(`/performance/record/${recordId}?client_id=${encodeURIComponent(clientId)}`);
            await refreshDetailData();
        } catch {
            alert('Failed to delete performance record.');
            await refreshDetailData(); // revert on error
        }
    };

    const openEditModal = (record: StudentPerformanceDetail) => {
        setEditModalRecord(record);
        setEditForm({
            assessment_name: record.assessment_name,
            score: String(record.score),
            max_score: String(record.max_score)
        });
    };

    const handleSaveEdit = async () => {
        if (!editModalRecord) return;
        setSaving(true);
        try {
            await apiClient.put(`/performance/record/${editModalRecord.id}`, {
                client_id: clientId,
                assessment_name: editForm.assessment_name,
                score: parseFloat(editForm.score),
                max_score: parseFloat(editForm.max_score)
            });
            setEditModalRecord(null);
            await refreshDetailData();
        } catch {
            alert('Failed to update performance record.');
        } finally {
            setSaving(false);
        }
    };

    const filteredDetails = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let records = detailRecords;
        if (query) {
            records = records.filter(record => {
                const fullName = `${record.first_name} ${record.last_name}`.toLowerCase();
                const adminId = (record.admission_id || '').toLowerCase();
                return fullName.includes(query) || adminId.includes(query);
            });
        }
        // Sort
        return [...records].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'admission_id': cmp = (a.admission_id || '').localeCompare(b.admission_id || ''); break;
                case 'name': cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
                case 'assessment_name': cmp = a.assessment_name.localeCompare(b.assessment_name); break;
                case 'score': cmp = a.score - b.score; break;
                case 'max_score': cmp = a.max_score - b.max_score; break;
                case 'percentage': {
                    const pctA = a.max_score > 0 ? a.score / a.max_score : 0;
                    const pctB = b.max_score > 0 ? b.score / b.max_score : 0;
                    cmp = pctA - pctB;
                    break;
                }
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });
    }, [detailRecords, searchQuery, sortKey, sortDir]);

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

            {/* Bulk Upload Section (Admin/Teacher Only) */}
            {isAdminOrTeacher && (
                <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <FileSpreadsheet size={20} className="text-indigo-600" />
                        Bulk Upload Performance Records
                    </h3>
                    <form onSubmit={handlePerformanceUpload} className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-1">CSV File (admission_id, course_title, assessment_name, score, max_score)</label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setUploadStatus({ type: '', message: '' }); }}
                                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!uploadFile || uploading}
                            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            <Upload size={16} />
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </form>
                    {uploadStatus.message && (
                        <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${uploadStatus.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                            {uploadStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {uploadStatus.message}
                        </div>
                    )}
                </div>
            )}

            {isAdminOrTeacher ? (
                <>
                    {/* Level 1: Summary Cards Grouped by Class + Course */}
                    {!selectedCourse && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {summaryRecords.map((summary, idx) => {
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
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('admission_id')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Admission ID <SortIcon col="admission_id" />
                                                    </button>
                                                </th>
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Student Name <SortIcon col="name" />
                                                    </button>
                                                </th>
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('assessment_name')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Assessment <SortIcon col="assessment_name" />
                                                    </button>
                                                </th>
                                                <th className="p-4 text-right">
                                                    <button onClick={() => toggleSort('score')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition ml-auto">
                                                        Score <SortIcon col="score" />
                                                    </button>
                                                </th>
                                                <th className="p-4 text-left">
                                                    <button onClick={() => toggleSort('max_score')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Max <SortIcon col="max_score" />
                                                    </button>
                                                </th>
                                                <th className="p-4 text-center">
                                                    <button onClick={() => toggleSort('percentage')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition mx-auto">
                                                        Percentage <SortIcon col="percentage" />
                                                    </button>
                                                </th>
                                                {isAdminOrTeacher && <th className="p-4 font-semibold text-center w-16">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredDetails.length > 0 ? filteredDetails.map((record) => {
                                                const pct = record.max_score > 0 ? (record.score / record.max_score) * 100 : 0;
                                                return (
                                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
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
                                                        {isAdminOrTeacher && (
                                                            <td className="p-4 text-center">
                                                                <ActionMenu
                                                                    onEdit={() => openEditModal(record)}
                                                                    onDelete={() => handleDeleteRecord(record.id)}
                                                                />
                                                            </td>
                                                        )}
                                                    </tr>
                                                )
                                            }) : (
                                                <tr>
                                                    <td colSpan={isAdminOrTeacher ? 7 : 6} className="p-12 text-center text-gray-500">
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
                            <p className="text-xl font-medium">No performance records available yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Performance Modal */}
            {editModalRecord && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Edit Performance Record</h3>
                                <p className="text-sm text-gray-500">{editModalRecord.first_name} {editModalRecord.last_name}</p>
                            </div>
                            <button onClick={() => setEditModalRecord(null)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Name</label>
                                <input
                                    type="text"
                                    value={editForm.assessment_name}
                                    onChange={(e) => setEditForm({ ...editForm, assessment_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                                    <input
                                        type="number"
                                        value={editForm.score}
                                        onChange={(e) => setEditForm({ ...editForm, score: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                                    <input
                                        type="number"
                                        value={editForm.max_score}
                                        onChange={(e) => setEditForm({ ...editForm, max_score: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setEditModalRecord(null)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
