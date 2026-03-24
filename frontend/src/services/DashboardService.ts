import { apiClient } from '../api/client';

export interface DashboardData {
    total_courses: number;
    enrolled_courses: number;
    upcoming_assignments: number;
}

export class DashboardService {
    static async getDashboardData(userId: number, clientId?: string): Promise<DashboardData> {
        const response = await apiClient.post<DashboardData>('/users/dashboard', {
            user_id: userId,
            client_id: clientId
        });
        return response.data;
    }
}
