import axios from 'axios';
import { encryptPayload, decryptPayload } from '../utils/encryption';

// Ensure this matches your FastAPI server route
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor: attach JWT token ────────────────
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('erp_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Encrypt Payload (excluding config — already a GET, and multipart form uploads)
        if (config.data && !config.url?.includes('/config') && config.headers['Content-Type'] !== 'multipart/form-data') {
            config.data = encryptPayload(config.data);
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: redirect on 401 ────────────────
apiClient.interceptors.response.use(
    (response) => {
        // Decrypt Payload (if string)
        if (typeof response.data === 'string' && !response.config.url?.includes('/docs')) {
            try {
                // The backend sends a quoted string like "eyJpdiI6..."
                const cleanData = response.data.replace(/^"|"$/g, '');
                response.data = decryptPayload(cleanData);
            } catch (e) {
                console.error("Failed to decrypt response:", e);
            }
        }
        return response;
    },
    (error) => {
        // Try to decrypt error response body
        if (error.response?.data && typeof error.response.data === 'string') {
            try {
                const cleanData = error.response.data.replace(/^"|"$/g, '');
                error.response.data = decryptPayload(cleanData);
            } catch (_) {
                // If decryption fails, leave the data as-is
            }
        }
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
            localStorage.removeItem('erp_token');
            localStorage.removeItem('erp_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
