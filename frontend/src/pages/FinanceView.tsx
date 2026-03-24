import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { IndianRupee, ArrowLeft, CheckCircle, AlertCircle, Clock, Upload, FileSpreadsheet, CheckCircle2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getTenantFromUrl } from '../utils/tenant';
import { apiClient } from '../api/client';
import ActionMenu from '../components/ActionMenu';

interface FinanceSummary {
    class_name: string;
    total_due: number;
    total_paid: number;
    student_count: number;
}

interface FeeRecord {
    id: number;
    term: string;
    amount_due: number;
    amount_paid: number;
    status: string;
}

interface StudentFeeDetail {
    user_id: number;
    first_name: string;
    last_name: string;
    admission_id: string | null;
    fees: FeeRecord[];
}

type SortKey = 'term' | 'amount_due' | 'amount_paid' | 'status';
type SortDir = 'asc' | 'desc';

export default function FinanceView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || getTenantFromUrl() || 'Prahitha Edu';

    const [summaryData, setSummaryData] = useState<FinanceSummary[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [students, setStudents] = useState<StudentFeeDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    const [editingFee, setEditingFee] = useState<number | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: string; message: string }>({ type: '', message: '' });

    // Edit modal state
    const [editModalFee, setEditModalFee] = useState<FeeRecord | null>(null);
    const [editForm, setEditForm] = useState({ term: '', amount_due: '', amount_paid: '' });
    const [saving, setSaving] = useState(false);

    // Sort state
    const [sortKey, setSortKey] = useState<SortKey>('term');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const isAdmin = user?.role === 'college_admin' || user?.role === 'system_admin';

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const sortFees = (fees: FeeRecord[]): FeeRecord[] => {
        return [...fees].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'term': cmp = a.term.localeCompare(b.term); break;
                case 'amount_due': cmp = a.amount_due - b.amount_due; break;
                case 'amount_paid': cmp = a.amount_paid - b.amount_paid; break;
                case 'status': cmp = a.status.localeCompare(b.status); break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });
    };

    const handleFeeUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        setUploading(true);
        setUploadStatus({ type: '', message: '' });

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('client_id', clientId);

        try {
            const response = await apiClient.post('/finance/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadStatus({ type: 'success', message: response.data.message || 'Fee records imported successfully!' });
            setUploadFile(null);
            apiClient.post('/finance/summary', { client_id: clientId })
                .then(res => setSummaryData(res.data));
        } catch (error: any) {
            setUploadStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to upload CSV.' });
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        apiClient.post('/finance/summary', { client_id: clientId })
            .then(res => { setSummaryData(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [clientId]);

    const openClassDetails = async (className: string) => {
        setSelectedClass(className);
        setDetailLoading(true);
        try {
            const res = await apiClient.post('/finance/class-details', { client_id: clientId, class_name: className });
            setStudents(res.data);
        } catch (err) {
            console.error("Error fetching class fees", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshData = async () => {
        if (selectedClass) {
            const res = await apiClient.post('/finance/class-details', { client_id: clientId, class_name: selectedClass });
            setStudents(res.data);
        }
        const summaryRes = await apiClient.post('/finance/summary', { client_id: clientId });
        setSummaryData(summaryRes.data);
    };

    const handlePayFee = async (feeId: number, amount: number) => {
        if (amount <= 0 || isNaN(amount)) return;
        try {
            await apiClient.post(`/finance/pay/${feeId}`, { client_id: clientId, amount_paid: amount });
            setEditingFee(null);
            setEditAmount('');
            await refreshData();
        } catch (err) {
            console.error("Error updating fee", err);
        }
    };

    const handleDeleteFee = async (feeId: number) => {
        console.log('[DELETE] Deleting fee record:', feeId);
        // Optimistic: remove from UI immediately
        setStudents(prev => prev.map(s => ({
            ...s,
            fees: s.fees.filter(f => f.id !== feeId)
        })).filter(s => s.fees.length > 0));
        try {
            await apiClient.delete(`/finance/record/${feeId}?client_id=${encodeURIComponent(clientId)}`);
            await refreshData();
        } catch {
            alert('Failed to delete fee record.');
            await refreshData(); // revert on error
        }
    };

    const openEditModal = (fee: FeeRecord) => {
        setEditModalFee(fee);
        setEditForm({
            term: fee.term,
            amount_due: String(fee.amount_due),
            amount_paid: String(fee.amount_paid)
        });
    };

    const handleSaveEdit = async () => {
        if (!editModalFee) return;
        setSaving(true);
        try {
            await apiClient.put(`/finance/record/${editModalFee.id}`, {
                client_id: clientId,
                term: editForm.term,
                amount_due: parseFloat(editForm.amount_due),
                amount_paid: parseFloat(editForm.amount_paid)
            });
            setEditModalFee(null);
            await refreshData();
        } catch {
            alert('Failed to update fee record.');
        } finally {
            setSaving(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Paid': return <CheckCircle size={16} className="text-green-500" />;
            case 'Partial': return <AlertCircle size={16} className="text-yellow-500" />;
            default: return <Clock size={16} className="text-red-500" />;
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            Paid: 'bg-green-100 text-green-800 border-green-200',
            Partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            Pending: 'bg-red-100 text-red-800 border-red-200'
        };
        return (
            <span className={`px-2 py-1 flex items-center gap-1 text-xs font-semibold rounded-full border ${colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {getStatusIcon(status)}
                {status}
            </span>
        );
    };

    if (loading) return <div className="p-8 text-xl font-medium text-gray-600 animate-pulse">Loading finance data...</div>;

    // ─── CLASS CARDS VIEW (default landing) ────────────────────────
    if (!selectedClass) {
        return (
            <div className="w-full">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b-4 border-indigo-600 pb-2 inline-block">Finance Management</h1>
                    <p className="mt-2 text-gray-600 text-lg">Fee collection overview by degree / year.</p>
                </div>

                {isAdmin && (
                    <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <FileSpreadsheet size={20} className="text-indigo-600" />
                            Bulk Upload Fee Records
                        </h3>
                        <form onSubmit={handleFeeUpload} className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-600 mb-1">CSV File (admission_id, term, amount_due, amount_paid, status, due_date)</label>
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

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {summaryData.map((data) => {
                        const percentage = Math.min(100, Math.round((data.total_paid / data.total_due) * 100)) || 0;
                        return (
                            <div
                                key={data.class_name}
                                onClick={() => openClassDetails(data.class_name)}
                                className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                            >
                                <div className="bg-indigo-600 p-5">
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        <IndianRupee size={20} className="text-indigo-200" />
                                        {data.class_name}
                                    </h3>
                                    <p className="text-indigo-200 text-sm mt-1">{data.student_count} Student(s)</p>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-medium text-gray-500">Collection Status</span>
                                        <span className="text-sm font-bold text-indigo-700">{percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
                                        <div className={`h-2.5 rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <p className="text-gray-500">Collected</p>
                                            <p className="font-bold text-green-700">₹{data.total_paid.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500">Remaining</p>
                                            <p className="font-bold text-red-600">₹{(data.total_due - data.total_paid).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── STUDENT DETAIL VIEW (after clicking a class card) ─────────
    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button
                        onClick={() => { setSelectedClass(null); setStudents([]); }}
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition font-medium mb-3"
                    >
                        <ArrowLeft size={16} /> Back to All Classes
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b-4 border-indigo-600 pb-2 inline-block">
                        {selectedClass}
                    </h1>
                    <p className="mt-2 text-gray-600 text-lg">Student-wise fee payment details.</p>
                </div>
            </div>

            {detailLoading ? (
                <div className="p-8 text-xl font-medium text-gray-600 animate-pulse">Loading student records...</div>
            ) : (
                <div className="space-y-6">
                    {students.map((student) => {
                        const totalDue = student.fees.reduce((acc, f) => acc + f.amount_due, 0);
                        const totalPaid = student.fees.reduce((acc, f) => acc + f.amount_paid, 0);
                        const percentage = Math.min(100, Math.round((totalPaid / totalDue) * 100)) || 0;

                        return (
                            <div key={student.user_id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-indigo-50 border-b border-indigo-100 p-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-3">
                                            <IndianRupee size={24} className="text-indigo-600" />
                                            {student.first_name} {student.last_name}
                                        </h2>
                                        <p className="text-indigo-700 mt-1 pl-9 font-mono text-sm">ID: {student.admission_id || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-600">Total Paid / Due</p>
                                        <p className="text-xl font-bold text-gray-900">₹{totalPaid.toLocaleString()} <span className="text-gray-400 text-lg font-normal">/ ₹{totalDue.toLocaleString()}</span></p>
                                        <div className="w-32 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                            <div className={`h-full ${percentage === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sortable column headers */}
                                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <button onClick={() => toggleSort('term')} className="flex items-center gap-1 hover:text-indigo-600 transition text-left">
                                        Term <SortIcon col="term" />
                                    </button>
                                    <button onClick={() => toggleSort('amount_due')} className="flex items-center gap-1 hover:text-indigo-600 transition text-left">
                                        Amount Due <SortIcon col="amount_due" />
                                    </button>
                                    <button onClick={() => toggleSort('amount_paid')} className="flex items-center gap-1 hover:text-indigo-600 transition text-left">
                                        Amount Paid <SortIcon col="amount_paid" />
                                    </button>
                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-indigo-600 transition text-left">
                                        Status <SortIcon col="status" />
                                    </button>
                                    {isAdmin && <span className="text-center">Actions</span>}
                                </div>

                                <ul className="divide-y divide-gray-100 p-2">
                                    {sortFees(student.fees).map((fee) => (
                                        <li key={fee.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors rounded-xl">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-lg min-w-[48px] text-center">
                                                    {fee.term.split(' ')[1] || fee.term.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900 uppercase tracking-wide">{fee.term}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        Paid: <span className="font-semibold text-gray-900">₹{fee.amount_paid.toLocaleString()}</span> / ₹{fee.amount_due.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-4 flex-1 w-full mt-4 md:mt-0">
                                                <StatusBadge status={fee.status} />

                                                {isAdmin && fee.status !== 'Paid' && (
                                                    <div className="flex items-center gap-2">
                                                        {editingFee === fee.id ? (
                                                            <>
                                                                <input
                                                                    type="number"
                                                                    className="w-24 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="Amount"
                                                                    value={editAmount}
                                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                                />
                                                                <button
                                                                    onClick={() => handlePayFee(fee.id, parseFloat(editAmount))}
                                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => { setEditingFee(null); setEditAmount(''); }}
                                                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingFee(fee.id)}
                                                                className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition border border-indigo-200"
                                                            >
                                                                Pay
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {isAdmin && (
                                                    <ActionMenu
                                                        onEdit={() => openEditModal(fee)}
                                                        onDelete={() => handleDeleteFee(fee.id)}
                                                    />
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                    {students.length === 0 && !detailLoading && (
                        <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                            No students found for this class.
                        </div>
                    )}
                </div>
            )}

            {/* Edit Fee Modal */}
            {editModalFee && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Edit Fee Record</h3>
                            <button onClick={() => setEditModalFee(null)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                                <input
                                    type="text"
                                    value={editForm.term}
                                    onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Due (₹)</label>
                                <input
                                    type="number"
                                    value={editForm.amount_due}
                                    onChange={(e) => setEditForm({ ...editForm, amount_due: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                                <input
                                    type="number"
                                    value={editForm.amount_paid}
                                    onChange={(e) => setEditForm({ ...editForm, amount_paid: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setEditModalFee(null)}
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
