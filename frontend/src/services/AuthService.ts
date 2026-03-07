import { apiClient } from '../api/client';
import type { User } from '../types';

interface LoginResponse extends User {
    access_token: string;
    token_type: string;
}

export class AuthService {
    static async login(email: string, password: string, client_id: string): Promise<LoginResponse> {
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', { email, password, client_id });
            return response.data;
        } catch (error) {
            console.error("Login failed", error);
            throw new Error('Invalid credentials');
        }
    }
}
