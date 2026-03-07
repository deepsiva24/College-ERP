import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { UploadCloud, CheckCircle, XCircle, Clock, Users, FileSpreadsheet, Loader } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface ClassInfo {
    class_name: string;
    section: string;
}

interface StudentBasic {
    user_id: number;
    admission_id: string | null;
    first_name: string;
    last_name: string;
}

export default function RecordAttendanceView() {
    const { user } = useAuthStore();
    const clientId = user?.client_id || 'Prahitha Educational';
    const token = localStorage.getItem('token');
    const [activeTab, setActiveTab] = useState<'flashcard' | 'bulk'>('flashcard');

    // Flashcard State
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState<StudentBasic[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isFetchingStudents, setIsFetchingStudents] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Bulk Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadResult, setUploadResult] = useState<{ added: number, updated: number, errors: string[] } | null>(null);

    // Initial Load - Get Available Classes
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await apiClient.get(`/classes?client_id=${clientId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setClasses(res.data);
            } catch (err) {
                console.error("Failed to load classes", err);
            }
        };
        fetchClasses();
    }, [token]);

    // Handle Class Selection Change
    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedClass(val);
        // Reset section when class changes
        setSelectedSection('');
        setStudents([]);
        setCurrentIndex(0);
    };

    const uniqueClasses = Array.from(new Set(classes.map(c => c.class_name)));
    const availableSections = classes.filter(c => c.class_name === selectedClass).map(c => c.section);

    // Fetch Students once a class and section are selected
    const handleFetchStudents = async () => {
        if (!selectedClass || !selectedSection || !attendanceDate) return;
        setIsFetchingStudents(true);
        try {
            const res = await apiClient.get(`/students/by-class?class_name=${selectedClass}&section=${selectedSection}&client_id=${clientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudents(res.data);
            setCurrentIndex(0);
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setIsFetchingStudents(false);
        }
    };

    // Record individual student
    const handleRecordStatus = async (status: 'Present' | 'Absent' | 'Late') => {
        if (students.length === 0 || currentIndex >= students.length) return;
        setIsSubmitting(true);
        const st = students[currentIndex];
        try {
            await apiClient.post('/attendance/record', {
                student_id: st.user_id,
                date: attendanceDate,
                status: status,
                client_id: clientId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Move to next student
            setCurrentIndex(prev => prev + 1);
        } catch (err) {
            console.error(`Failed to record ${status} for user ${st.user_id}`, err);
            alert("Failed to record attendance, please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Bulk Upload Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setUploadStatus('idle');
            setUploadResult(null);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('client_id', clientId);

        try {
            const res = await apiClient.post('/attendance/bulk-upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setUploadResult({
                added: res.data.records_added,
                updated: res.data.records_updated,
                errors: res.data.errors || []
            });
            setUploadStatus('success');
        } catch (err) {
            console.error("Failed to upload CSV", err);
            setUploadStatus('error');
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Record Attendance</h1>
                    <p className="text-gray-500 mt-2 font-medium">Rapidly mark daily attendance or upload CSV sheets in bulk.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-full max-w-md">
                <button
                    onClick={() => setActiveTab('flashcard')}
                    className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'flashcard' ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <Users size={18} />
                    Live Record
                </button>
                <button
                    onClick={() => setActiveTab('bulk')}
                    className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === 'bulk' ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <FileSpreadsheet size={18} />
                    Bulk Upload
                </button>
            </div>

            {/* Tab Content: Flashcard */}
            {activeTab === 'flashcard' && (
                <div className="space-y-6">
                    {/* Filter Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Degree/Year</label>
                            <select
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-50"
                                value={selectedClass}
                                onChange={handleClassChange}
                            >
                                <option value="">Select Class...</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Section</label>
                            <select
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-50"
                                value={selectedSection}
                                onChange={(e) => {
                                    setSelectedSection(e.target.value);
                                    setStudents([]);
                                }}
                                disabled={!selectedClass}
                            >
                                <option value="">Select Section...</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                            <input
                                type="date"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-50"
                                value={attendanceDate}
                                onChange={(e) => setAttendanceDate(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-auto mt-4 md:mt-0">
                            <button
                                onClick={handleFetchStudents}
                                disabled={!selectedClass || !selectedSection || isFetchingStudents}
                                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center min-w-[140px]"
                            >
                                {isFetchingStudents ? <Loader size={20} className="animate-spin" /> : 'Load Roster'}
                            </button>
                        </div>
                    </div>

                    {/* The Flashcard Arena */}
                    {students.length > 0 && currentIndex < students.length && (
                        <div className="flex justify-center mt-12 animate-fade-in-up">
                            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 p-10 w-full max-w-2xl transform transition-all relative overflow-hidden">
                                {/* Background Decorative Elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full -z-10 opacity-50"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-50 rounded-tr-full -z-10 opacity-50"></div>

                                <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                        <Users size={16} className="text-indigo-400" />
                                        Student {currentIndex + 1} of {students.length}
                                    </span>
                                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                                        {((currentIndex / students.length) * 100).toFixed(0)}% Complete
                                    </span>
                                </div>

                                <div className="text-center mb-12">
                                    <div className="inline-block bg-gray-100 text-gray-600 px-4 py-2 rounded-xl mb-6 font-mono font-medium text-sm">
                                        {students[currentIndex].admission_id || 'ID Pending'}
                                    </div>
                                    <h2 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">
                                        {students[currentIndex].first_name} <span className="text-indigo-600">{students[currentIndex].last_name}</span>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <button
                                        onClick={() => handleRecordStatus('Present')}
                                        disabled={isSubmitting}
                                        className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-md transition-all group disabled:opacity-50 border border-green-200"
                                    >
                                        <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                            <CheckCircle size={32} className="text-green-500" />
                                        </div>
                                        <span className="font-extrabold text-lg">Present</span>
                                    </button>

                                    <button
                                        onClick={() => handleRecordStatus('Late')}
                                        disabled={isSubmitting}
                                        className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:shadow-md transition-all group disabled:opacity-50 border border-yellow-200"
                                    >
                                        <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                            <Clock size={32} className="text-yellow-500" />
                                        </div>
                                        <span className="font-extrabold text-lg">Late</span>
                                    </button>

                                    <button
                                        onClick={() => handleRecordStatus('Absent')}
                                        disabled={isSubmitting}
                                        className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-md transition-all group disabled:opacity-50 border border-red-200"
                                    >
                                        <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                            <XCircle size={32} className="text-red-500" />
                                        </div>
                                        <span className="font-extrabold text-lg">Absent</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {students.length > 0 && currentIndex >= students.length && (
                        <div className="bg-green-50 rounded-2xl p-12 text-center shadow-sm border border-green-100 mt-12 animate-fade-in-up">
                            <div className="inline-flex bg-white p-4 rounded-full mb-6 shadow-sm">
                                <CheckCircle size={48} className="text-green-500" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">All Done!</h2>
                            <p className="text-lg text-green-800 font-medium">You have recorded attendance for all {students.length} students.</p>
                            <button
                                onClick={() => { setStudents([]); setSelectedSection(''); }}
                                className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all hover:shadow-lg"
                            >
                                Start Another Class
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content: Bulk Upload */}
            {activeTab === 'bulk' && (
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-4xl mx-auto flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                        <UploadCloud size={40} className="text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Upload CSV Roster</h2>
                    <p className="text-gray-500 font-medium mb-8 max-w-lg">
                        Upload a CSV file containing <code className="bg-gray-100 px-2 py-1 rounded text-sm text-indigo-600">admission_id</code>, <code className="bg-gray-100 px-2 py-1 rounded text-sm text-indigo-600">date</code> (YYYY-MM-DD), and <code className="bg-gray-100 px-2 py-1 rounded text-sm text-indigo-600">status</code> (Present/Absent/Late).
                    </p>

                    <div className="w-full max-w-md">
                        <label className="flex flex-col w-full h-40 border-4 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl cursor-pointer transition-all items-center justify-center p-6 group">
                            <span className="text-gray-500 group-hover:text-indigo-600 font-bold flex flex-col items-center gap-2">
                                <FileSpreadsheet size={32} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                {selectedFile ? selectedFile.name : "Click to select a CSV file"}
                            </span>
                            <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </label>

                        <button
                            onClick={handleFileUpload}
                            disabled={!selectedFile || uploadStatus === 'uploading'}
                            className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {uploadStatus === 'uploading' ? (
                                <><Loader size={20} className="animate-spin" /> Processing File...</>
                            ) : (
                                "Upload Full Roster"
                            )}
                        </button>

                        {/* Results / Feedback */}
                        {uploadResult && uploadStatus === 'success' && (
                            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl text-left animate-fade-in-up">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle className="text-green-600" size={24} />
                                    <h3 className="font-bold text-green-900 text-lg">Upload Successful</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                                        <p className="text-3xl font-black text-green-600">{uploadResult.added}</p>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">New Records</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                                        <p className="text-3xl font-black text-blue-600">{uploadResult.updated}</p>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Updated</p>
                                    </div>
                                </div>

                                {uploadResult.errors && uploadResult.errors.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-green-200">
                                        <p className="font-bold text-sm text-orange-800 mb-3 flex items-center gap-2">
                                            <XCircle size={16} /> Warnings ({uploadResult.errors.length})
                                        </p>
                                        <ul className="text-xs space-y-2 text-orange-700 bg-orange-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                                            {uploadResult.errors.map((err, i) => <li key={i}>• {err}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-left animate-fade-in-up flex items-start gap-3">
                                <XCircle className="text-red-500 shrink-0" size={24} />
                                <div>
                                    <h3 className="font-bold text-red-900 mb-1">Upload Failed</h3>
                                    <p className="text-sm text-red-700 font-medium">Check your CSV format and try again. Ensure no strings are blank and Dates are valid YYYY-MM-DD.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
