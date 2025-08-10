import ky from 'ky';

const api = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
    headers: { 'Content-Type': 'application/json' },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTemplates = (params?: Record<string, any>) =>
    api.get('templates', { searchParams: params }).json();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTemplate = (id: string | number, params?: Record<string, any>) =>
    api.get(`templates/${id}`, { searchParams: params }).json();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTests = (params?: Record<string, any>) =>
    api.get('tests', { searchParams: params }).json();

// Patients (assuming you’ll implement these)
// index, show, store
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPatients = (params?: Record<string, any>) =>
    api.get('patients', { searchParams: params }).json();

export const getPatient = (id: string | number) =>
    api.get(`patients/${id}`).json();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createPatient = (payload: any) =>
    api.post('patients', { json: payload }).json();

export default api;
