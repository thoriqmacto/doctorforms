import ky from 'ky';

const api = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
    headers: { 'Content-Type': 'application/json' },
});

export const getTemplates = (params?: Record<string, any>) =>
    api.get('templates', { searchParams: params }).json<any>();

export const getTemplate = (id: string | number, params?: Record<string, any>) =>
    api.get(`templates/${id}`, { searchParams: params }).json<any>();

// Patients (assuming you’ll implement these)
// index, show, store
export const getPatients = (params?: Record<string, any>) =>
    api.get('patients', { searchParams: params }).json<any>();

export const getPatient = (id: string | number) =>
    api.get(`patients/${id}`).json<any>();

export const createPatient = (payload: any) =>
    api.post('patients', { json: payload }).json<any>();

// Reports
export const getReport = (id: string | number, params?: Record<string, any>) =>
    api.get(`reports/${id}`, { searchParams: params }).json<any>();

export const createReport = (payload: any) =>
    api.post('reports', { json: payload }).json<any>();

export default api;
