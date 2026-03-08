import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { BookOpen, FileText, Video, Link as LinkIcon, Download, UploadCloud, ChevronDown, ChevronUp } from 'lucide-react';
import { getTenantFromUrl } from '../utils/tenant';
import { apiClient } from '../api/client';

interface Material {
    id: number;
    course_id: number;
    title: string;
    material_type: string;
    content_url: string;
}

interface Course {
    id: number;
    title: string;
    description: string;
    materials: Material[];
}

interface ClassCourseGroup {
    class_name: string;
    courses: Course[];
}

export default function LearningView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || getTenantFromUrl() || 'Prahitha Edu';
    const [groupedCourses, setGroupedCourses] = useState<ClassCourseGroup[]>([]);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchLearningData = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/learning/classes?client_id=${clientId}`);
            setGroupedCourses(res.data);
            if (res.data.length > 0) setExpandedClass(res.data[0].class_name);
        } catch (err) {
            console.error("Error fetching learning data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchLearningData();
        }
    }, [user, clientId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setUploadMessage({ text: 'Please select a valid CSV file.', type: 'error' });
            return;
        }

        setUploading(true);
        setUploadMessage({ text: '', type: '' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('client_id', clientId);

        try {
            const res = await apiClient.post('/courses/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMessage({ text: res.data.message || 'Courses uploaded successfully!', type: 'success' });

            // Re-fetch courses so admin can see new uploads
            fetchLearningData();
        } catch (err: any) {
            setUploadMessage({
                text: err.response?.data?.detail || 'Error uploading courses.',
                type: 'error'
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (loading) return <div className="p-8 text-xl font-medium text-gray-600 animate-pulse">Loading study materials...</div>;

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b-4 border-indigo-600 pb-2 inline-block">Learning Management System</h1>
                    <p className="mt-2 text-gray-600 text-lg">Access your course materials, videos, and reading list.</p>
                </div>

                {/* Admin Bulk Upload Section */}
                {(user?.role === 'college_admin' || user?.role === 'system_admin') && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-[300px]">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <UploadCloud size={18} className="text-indigo-600" />
                            Bulk Upload Courses
                        </h3>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors border border-indigo-200 text-sm flex-1 text-center disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Choose CSV File'}
                            </button>
                        </div>
                        {uploadMessage.text && (
                            <p className={`mt-2 text-xs font-medium ${uploadMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                                {uploadMessage.text}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {groupedCourses.map((group) => (
                    <div key={group.class_name} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div
                            className="bg-indigo-600 p-6 flex justify-between items-center cursor-pointer hover:bg-indigo-700 transition-colors"
                            onClick={() => setExpandedClass(expandedClass === group.class_name ? null : group.class_name)}
                        >
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <BookOpen size={24} className="text-indigo-100" />
                                    {group.class_name} {group.class_name === 'Unassigned Default' ? '' : 'Degree Program'}
                                </h2>
                                <p className="text-indigo-200 mt-1 pl-9">{group.courses.length} Assigned Course(s)</p>
                            </div>
                            <div className="text-white">
                                {expandedClass === group.class_name ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </div>
                        </div>

                        {expandedClass === group.class_name && (
                            <div className="p-6 space-y-8 bg-gray-50">
                                {group.courses.length === 0 ? (
                                    <p className="text-gray-500 italic">No courses currently mapped to this degree.</p>
                                ) : (
                                    group.courses.map((course) => (
                                        <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="bg-indigo-50 border-b border-indigo-100 p-5">
                                                <h3 className="text-lg font-bold text-indigo-900">{course.title}</h3>
                                                <p className="text-indigo-700 mt-1">{course.description}</p>
                                            </div>
                                            <ul className="divide-y divide-gray-100 p-2">
                                                {course.materials.length === 0 && (
                                                    <li className="p-4 text-gray-400 text-sm italic">No materials uploaded yet.</li>
                                                )}
                                                {course.materials.map((material) => (
                                                    <li key={material.id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors rounded-xl group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 rounded-lg ${material.material_type === 'PDF' ? 'bg-red-50 text-red-600' :
                                                                material.material_type === 'Video' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                                                                }`}>
                                                                {material.material_type === 'PDF' && <FileText size={20} />}
                                                                {material.material_type === 'Video' && <Video size={20} />}
                                                                {material.material_type === 'Link' && <LinkIcon size={20} />}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{material.title}</h4>
                                                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{material.material_type}</span>
                                                            </div>
                                                        </div>

                                                        <a
                                                            href={material.content_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-3 bg-gray-50 text-gray-600 hover:bg-indigo-600 hover:text-white rounded-full transition-all border border-gray-200 hover:border-indigo-600"
                                                        >
                                                            <Download size={20} />
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
