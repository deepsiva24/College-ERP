import { apiClient } from '../api/client';

export interface DashboardData {
    total_courses: number;
    enrolled_courses: number;
    upcoming_assignments: number;
}

export class DashboardService {
    static async getDashboardData(userId: number): Promise<DashboardData> {
        const response = await apiClient.get<DashboardData>(`/users/${userId}/dashboard`);
        return response.data;
    }
}
