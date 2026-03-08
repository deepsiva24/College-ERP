import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface ActionMenuProps {
    onEdit: () => void;
    onDelete: () => void;
    deleteConfirmMessage?: string;
}

export default function ActionMenu({ onEdit, onDelete, deleteConfirmMessage }: ActionMenuProps) {
    const [open, setOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
                setConfirmingDelete(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
        onEdit();
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setConfirmingDelete(true);
    };

    const handleConfirmDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
        setConfirmingDelete(false);
        onDelete();
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setConfirmingDelete(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); setConfirmingDelete(false); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 focus:outline-none"
                title="Actions"
            >
                <MoreVertical size={18} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden" style={{ minWidth: confirmingDelete ? '220px' : '144px' }}>
                    {!confirmingDelete ? (
                        <>
                            <button
                                onClick={handleEdit}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition-colors"
                            >
                                <Pencil size={14} /> Edit
                            </button>
                            <button
                                onClick={handleDeleteClick}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </>
                    ) : (
                        <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle size={16} />
                                <span className="text-xs font-semibold">Confirm Delete</span>
                            </div>
                            <p className="text-xs text-gray-600">{deleteConfirmMessage || 'This cannot be undone.'}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancelDelete}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
