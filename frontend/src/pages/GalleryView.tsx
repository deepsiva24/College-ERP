import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ImageIcon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { getTenantFromUrl } from '../utils/tenant';

interface GalleryItem {
    id: number;
    title: string;
    image_url: string;
    description?: string;
    upload_date: string;
}

export default function GalleryView() {
    const user = useAuthStore((state) => state.user);
    const clientId = user?.client_id || getTenantFromUrl() || 'Prahitha Edu';
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.post('/gallery', { client_id: clientId })
            .then(response => {
                setItems(response.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching gallery", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-xl font-medium text-gray-600 animate-pulse">Loading gallery images...</div>;

    return (
        <div className="w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b-4 border-indigo-600 pb-2 inline-block">Campus Gallery</h1>
                <p className="mt-2 text-gray-600 text-lg">Explore vibrant life and facilities around our campus.</p>
            </div>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {items.map((item) => (
                    <div key={item.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-md shadow-gray-200/50 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300">
                        <img
                            src={item.image_url}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-900/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-white font-bold text-xl drop-shadow-md">{item.title}</h3>
                            {item.description && (
                                <p className="text-gray-200 mt-2 text-sm drop-shadow line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                    {item.description}
                                </p>
                            )}
                        </div>
                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ImageIcon size={20} className="text-white drop-shadow-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                    <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-medium">No images have been uploaded to the gallery yet.</p>
                </div>
            )}
        </div>
    );
}
