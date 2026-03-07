import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { IndianRupee, ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '../api/client';

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

export default function FinanceView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || 'Prahitha Educational';

    const [summaryData, setSummaryData] = useState<FinanceSummary[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [students, setStudents] = useState<StudentFeeDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    const [editingFee, setEditingFee] = useState<number | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');

    // Fetch summary (class-level cards)
    useEffect(() => {
        setLoading(true);
        apiClient.get(`/finance/summary?client_id=${encodeURIComponent(clientId)}`)
            .then(res => { setSummaryData(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [clientId]);

    // Fetch student details when a class is selected
    const openClassDetails = async (className: string) => {
        setSelectedClass(className);
        setDetailLoading(true);
        try {
            const res = await apiClient.get(`/finance/class/${encodeURIComponent(className)}?client_id=${encodeURIComponent(clientId)}`);
            setStudents(res.data);
        } catch (err) {
            console.error("Error fetching class fees", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handlePayFee = async (feeId: number, amount: number) => {
        if (amount <= 0 || isNaN(amount)) return;
        try {
            await apiClient.post(`/finance/pay/${feeId}`, {
                client_id: clientId,
                amount_paid: amount
            });
            setEditingFee(null);
            setEditAmount('');
            // Refresh current class and summary
            if (selectedClass) openClassDetails(selectedClass);
            apiClient.get(`/finance/summary?client_id=${encodeURIComponent(clientId)}`)
                .then(res => setSummaryData(res.data));
        } catch (err) {
            console.error("Error updating fee", err);
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

                                <ul className="divide-y divide-gray-100 p-2">
                                    {student.fees.sort((a, b) => a.term.localeCompare(b.term)).map((fee) => (
                                        <li key={fee.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors rounded-xl">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-lg">
                                                    {fee.term.split(' ')[1]}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900 uppercase tracking-wide">{fee.term}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        Paid: <span className="font-semibold text-gray-900">₹{fee.amount_paid.toLocaleString()}</span> / ₹{fee.amount_due.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-6 flex-1 w-full mt-4 md:mt-0">
                                                <StatusBadge status={fee.status} />

                                                {user?.role === 'admin' && fee.status !== 'Paid' && (
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
        </div>
    );
}
