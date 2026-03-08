import React, { useState, useEffect, useMemo } from 'react';
import { Upload, UserPlus, FileSpreadsheet, AlertCircle, CheckCircle2, Users, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import ActionMenu from '../components/ActionMenu';

interface StudentRecord {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    admission_id: string | null;
    class_name: string | null;
    section: string | null;
}

type StudentSortKey = 'admission_id' | 'name' | 'email' | 'class_name' | 'section';
type SortDir = 'asc' | 'desc';
import { getTenantFromUrl } from '../utils/tenant';

export default function AddStudentView() {
    const { user } = useAuthStore();
    const clientId = user?.client_id || getTenantFromUrl() || 'Prahitha Edu';
    const isAdmin = user?.role === 'college_admin' || user?.role === 'system_admin';
    const [activeTab, setActiveTab] = useState<'form' | 'csv' | 'manage'>('form');

    // Form State
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', password: '',
        phone: '', address: '', gender: '', date_of_birth: '',
        admission_id: '', class_name: '', branch: '', section: '', father_name: ''
    });

    // File State
    const [file, setFile] = useState<File | null>(null);

    // Status
    const [status, setStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    // Manage tab state
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit modal state
    const [editModalStudent, setEditModalStudent] = useState<StudentRecord | null>(null);
    const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', admission_id: '', class_name: '', section: '' });
    const [saving, setSaving] = useState(false);

    // Sort state
    const [sortKey, setSortKey] = useState<StudentSortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const toggleSort = (key: StudentSortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: StudentSortKey }) => {
        if (sortKey !== col) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });
        try {
            await apiClient.post('/students/', { ...formData, client_id: clientId });
            setStatus({ type: 'success', message: 'Student added successfully!' });
            setFormData({
                first_name: '', last_name: '', email: '', password: '', phone: '', address: '',
                gender: '', date_of_birth: '', admission_id: '', class_name: '', branch: '', section: '', father_name: ''
            });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to add student. Please check input.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setStatus({ type: '', message: '' });

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('client_id', clientId);

        try {
            const response = await apiClient.post('/students/upload/', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setStatus({ type: 'success', message: response.data.message || 'Students imported successfully!' });
            setFile(null);
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to upload CSV.' });
        } finally {
            setLoading(false);
        }
    };

    // Manage tab functions
    const fetchStudents = async () => {
        setStudentsLoading(true);
        try {
            const res = await apiClient.get('/students/list/');
            setStudents(res.data);
        } catch {
            setStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'manage') {
            fetchStudents();
        }
    }, [activeTab]);

    const handleDeleteStudent = async (studentId: number) => {
        console.log('[DELETE] Deleting student:', studentId);
        // Optimistic: remove from UI immediately
        setStudents(prev => prev.filter(s => s.id !== studentId));
        try {
            await apiClient.delete(`/students/${studentId}?client_id=${encodeURIComponent(clientId)}`);
            setStatus({ type: 'success', message: 'Student deleted successfully.' });
        } catch {
            setStatus({ type: 'error', message: 'Failed to delete student.' });
            await fetchStudents(); // revert on error
        }
    };

    const openEditModal = (student: StudentRecord) => {
        setEditModalStudent(student);
        setEditForm({
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            admission_id: student.admission_id || '',
            class_name: student.class_name || '',
            section: student.section || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editModalStudent) return;
        setSaving(true);
        try {
            await apiClient.put(`/students/${editModalStudent.id}`, {
                client_id: clientId,
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                email: editForm.email,
                admission_id: editForm.admission_id,
                class_name: editForm.class_name,
                section: editForm.section
            });
            setEditModalStudent(null);
            await fetchStudents();
            setStatus({ type: 'success', message: 'Student updated successfully.' });
        } catch {
            setStatus({ type: 'error', message: 'Failed to update student.' });
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let records = students;
        if (q) {
            records = records.filter(s =>
                s.first_name.toLowerCase().includes(q) ||
                s.last_name.toLowerCase().includes(q) ||
                (s.admission_id || '').toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q) ||
                (s.class_name || '').toLowerCase().includes(q)
            );
        }
        // Sort
        return [...records].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'admission_id': cmp = (a.admission_id || '').localeCompare(b.admission_id || ''); break;
                case 'name': cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
                case 'email': cmp = a.email.localeCompare(b.email); break;
                case 'class_name': cmp = (a.class_name || '').localeCompare(b.class_name || ''); break;
                case 'section': cmp = (a.section || '').localeCompare(b.section || ''); break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });
    }, [students, searchQuery, sortKey, sortDir]);

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Add Students</h1>
                <p className="text-gray-500 mt-1">Enroll new students individually, import them in bulk, or manage existing records.</p>
            </div>

            {status.message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="font-medium">{status.message}</p>
                </div>
            )}

            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-all duration-200 ${activeTab === 'form' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <UserPlus className="w-5 h-5" /> Manual Entry
                    </button>
                    <button
                        onClick={() => setActiveTab('csv')}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-all duration-200 ${activeTab === 'csv' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <FileSpreadsheet className="w-5 h-5" /> Bulk Upload (CSV)
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-all duration-200 ${activeTab === 'manage' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Users className="w-5 h-5" /> Manage Students
                        </button>
                    )}
                </div>

                <div className="p-8">
                    {activeTab === 'form' ? (
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                    <input required name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                    <input required name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
                                    <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Admission ID</label>
                                    <input name="admission_id" value={formData.admission_id} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                    <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class/Grade</label>
                                    <input name="class_name" value={formData.class_name} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch/Department</label>
                                    <input name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                                    <input name="section" value={formData.section} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                                    <input name="father_name" value={formData.father_name} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button disabled={loading} type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
                                    {loading ? 'Adding...' : <><UserPlus className="w-5 h-5" /> Enroll Student</>}
                                </button>
                            </div>
                        </form>
                    ) : activeTab === 'csv' ? (
                        <div className="max-w-xl mx-auto py-8">
                            <form onSubmit={handleFileUpload} className="space-y-6">
                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-indigo-500 transition-colors bg-gray-50/50">
                                    <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Upload CSV File</h3>
                                    <p className="text-gray-500 text-sm mb-4">Please ensure your highly structured CSV matches the required headers.</p>

                                    <input
                                        type="file"
                                        id="file-upload"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        Select File
                                    </label>
                                    {file && <p className="mt-4 text-sm font-medium text-indigo-600">Selected: {file.name}</p>}
                                </div>

                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                                    <strong>Expected Headers:</strong> admission_id, name, photo_url, phone_number, place, email, date_of_birth, class_name, father_name, branch, section, gender
                                </div>

                                <button disabled={!file || loading} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                                    {loading ? 'Uploading...' : 'Import Students'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* Manage Students Tab */
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID, email, class..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <span className="text-sm text-gray-500 font-medium">
                                    {filteredStudents.length} student(s)
                                </span>
                            </div>

                            {studentsLoading ? (
                                <div className="p-12 text-center text-gray-500 animate-pulse text-lg">Loading students...</div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('admission_id')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Admission ID <SortIcon col="admission_id" />
                                                    </button>
                                                </th>
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Name <SortIcon col="name" />
                                                    </button>
                                                </th>
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('email')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Email <SortIcon col="email" />
                                                    </button>
                                                </th>
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('class_name')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Class <SortIcon col="class_name" />
                                                    </button>
                                                </th>
                                                <th className="p-4">
                                                    <button onClick={() => toggleSort('section')} className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition">
                                                        Section <SortIcon col="section" />
                                                    </button>
                                                </th>
                                                <th className="p-4 font-semibold text-center w-16">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                                <tr
                                                    key={student.id}
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="p-4 font-medium text-gray-900">{student.admission_id || 'N/A'}</td>
                                                    <td className="p-4 text-gray-800 font-medium">{student.first_name} {student.last_name}</td>
                                                    <td className="p-4 text-gray-600 text-sm">{student.email}</td>
                                                    <td className="p-4 text-gray-700">{student.class_name || '—'}</td>
                                                    <td className="p-4 text-gray-700">{student.section || '—'}</td>
                                                    <td className="p-4 text-center">
                                                        <ActionMenu
                                                            onEdit={() => openEditModal(student)}
                                                            onDelete={() => handleDeleteStudent(student.id)}
                                                        />
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-gray-500">
                                                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium">No students found.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Student Modal */}
            {editModalStudent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Edit Student</h3>
                            <button onClick={() => setEditModalStudent(null)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admission ID</label>
                                <input
                                    type="text"
                                    value={editForm.admission_id}
                                    onChange={(e) => setEditForm({ ...editForm, admission_id: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                    <input
                                        type="text"
                                        value={editForm.class_name}
                                        onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                                    <input
                                        type="text"
                                        value={editForm.section}
                                        onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setEditModalStudent(null)}
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
