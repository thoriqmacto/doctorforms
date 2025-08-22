import ky from 'ky';

const api = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
    headers: { 'Content-Type': 'application/json' },
    hooks: {
        beforeRequest: [
            (request) => {
                if (typeof window !== 'undefined') {
                    const stored = window.localStorage.getItem('auth');
                    if (stored) {
                        try {
                            const { token } = JSON.parse(stored);
                            if (token) {
                                request.headers.set('Authorization', `Bearer ${token}`);
                            }
                        } catch {
                            // ignore parse errors
                        }
                    }
                }
            },
        ],
    },
});
export interface TemplatePayload {
    name: string;
    description?: string;
    user_id: number;
    test_id: number;
    hospital_id: number;
}

export interface TemplateFieldPayload {
    template_id: number;
    section: string;
    label: string;
    type: string;
    options?: string[] | null;
    order?: number;
    field_group_order?: number;
    required?: boolean;
}
export const getTemplates = (params?: Record<string, any>) =>
    api.get('templates', { searchParams: params }).json<any>();
export const getTemplate = (id: string | number, params?: Record<string, any>) =>
    api.get(`templates/${id}`, { searchParams: params }).json<any>();
export const createTemplate = (payload: TemplatePayload) =>
    api.post('templates', { json: payload }).json<any>();
export const createTemplateField = (payload: TemplateFieldPayload) =>
    api.post('template-fields', { json: payload }).json<any>();
export const updateTemplate = (
    id: string | number,
    payload: Partial<TemplatePayload>,
) => api.patch(`templates/${id}`, { json: payload }).json<any>();
export const deleteTemplate = (id: string | number) =>
    api.delete(`templates/${id}`).json<any>();
export const getTests = (params?: Record<string, any>) =>
    api.get('tests', { searchParams: params }).json();
export const getPatients = (params?: Record<string, any>) =>
    api.get('patients', { searchParams: params }).json<any>();

export const getPatient = (id: string | number) =>
    api.get(`patients/${id}`).json<any>();
export const createPatient = (payload: any) =>
    api.post('patients', { json: payload }).json<any>();
export const updatePatient = (id: string | number, payload: any) =>
    api.put(`patients/${id}`, { json: payload }).json<any>();
export const deletePatient = (id: string | number) =>
    api.delete(`patients/${id}`).json<any>();

// Hospitals
export const getHospitals = (params?: Record<string, any>) =>
    api.get('hospitals', { searchParams: params }).json<any>();
export const getHospital = (id: string | number) =>
    api.get(`hospitals/${id}`).json<any>();
export const createHospital = (payload: any) =>
    api.post('hospitals', { json: payload }).json<any>();
export const updateHospital = (id: string | number, payload: any) =>
    api.put(`hospitals/${id}`, { json: payload }).json<any>();
export const deleteHospital = (id: string | number) =>
    api.delete(`hospitals/${id}`).json<any>();

// Users
export const getUsers = (params?: Record<string, any>) =>
    api.get('users', { searchParams: params }).json<any>();
export const getUser = (id: string | number) =>
    api.get(`users/${id}`).json<any>();
export const createUser = (payload: any) =>
    api.post('users', { json: payload }).json<any>();
export const updateUser = (id: string | number, payload: any) =>
    api.put(`users/${id}`, { json: payload }).json<any>();
export const deleteUser = (id: string | number) =>
    api.delete(`users/${id}`).json<any>();

// Reports
export const getReports = (params?: Record<string, any>) =>
    api.get('reports', { searchParams: params }).json<any>();
export const getReport = (id: string | number, params?: Record<string, any>) =>
    api.get(`reports/${id}`, { searchParams: params }).json<any>();
export const updateReport = (id: string | number, payload: any) =>
    api.put(`reports/${id}`, { json: payload }).json<any>();
export const createReport = (payload: any) =>
    api.post('reports', { json: payload }).json<any>();
export const deleteReport = (id: string | number) =>
    api.delete(`reports/${id}`).json<any>();

export const login = (payload: { email: string; password: string }) =>
    api.post('login', { json: payload }).json<any>();

export const logout = () => api.post('logout').json<any>();

export default api;
