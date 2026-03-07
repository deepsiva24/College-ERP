import React, { useState } from 'react';
import { Upload, UserPlus, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export default function AddStudentView() {
    const { user } = useAuthStore();
    const clientId = user?.client_id || 'Prahitha Educational';
    const [activeTab, setActiveTab] = useState<'form' | 'csv'>('form');

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

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Add Students</h1>
                <p className="text-gray-500 mt-1">Enroll new students individually or import them in bulk.</p>
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
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
}
