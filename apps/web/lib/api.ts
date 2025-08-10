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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTemplates = (params?: Record<string, any>) =>
    api.get('templates', { searchParams: params }).json<any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTemplate = (id: string | number, params?: Record<string, any>) =>
    api.get(`templates/${id}`, { searchParams: params }).json<any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTests = (params?: Record<string, any>) =>
    api.get('tests', { searchParams: params }).json();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPatients = (params?: Record<string, any>) =>
    api.get('patients', { searchParams: params }).json<any>();

export const getPatient = (id: string | number) =>
    api.get(`patients/${id}`).json<any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createPatient = (payload: any) =>
    api.post('patients', { json: payload }).json<any>();

// Reports
export const getReport = (id: string | number, params?: Record<string, any>) =>
    api.get(`reports/${id}`, { searchParams: params }).json<any>();

export const createReport = (payload: any) =>
    api.post('reports', { json: payload }).json<any>();

export const login = (payload: { email: string; password: string }) =>
    api.post('login', { json: payload }).json<any>();

export const logout = () => api.post('logout').json<any>();

export default api;
