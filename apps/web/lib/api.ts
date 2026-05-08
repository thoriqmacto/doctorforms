import ky from 'ky';

export const SESSION_EXPIRED_EVENT = 'doctorforms:session-expired';

const MAX_RETRY_QUEUE_SIZE = 20;

let hasActiveSessionExpiredPrompt = false;
const sessionRetryQueue: Request[] = [];

const queueSessionRetry = (request: Request) => {
    if (sessionRetryQueue.length >= MAX_RETRY_QUEUE_SIZE) {
        return;
    }

    try {
        sessionRetryQueue.push(request.clone());
    } catch {
        // request body might not be cloneable; skip retry queueing for this request
    }
};

const notifySessionExpired = (request: Request) => {
    if (typeof window === 'undefined') {
        return;
    }

    const stored = window.localStorage.getItem('auth');
    if (!stored) {
        return;
    }

    queueSessionRetry(request);
    if (hasActiveSessionExpiredPrompt) {
        return;
    }

    hasActiveSessionExpiredPrompt = true;
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
};

export const resetSessionExpiryState = () => {
    hasActiveSessionExpiredPrompt = false;
};

export const replayExpiredSessionRequests = async () => {
    if (typeof window === 'undefined' || sessionRetryQueue.length === 0) {
        return;
    }

    const queuedRequests = [...sessionRetryQueue];
    sessionRetryQueue.length = 0;

    const stored = window.localStorage.getItem('auth');
    let token: string | undefined;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            token = parsed?.token as string | undefined;
        } catch {
            token = undefined;
        }
    }

    await Promise.allSettled(
        queuedRequests.map((request) => {
            const headers = new Headers(request.headers);
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            return fetch(new Request(request, { headers }));
        }),
    );
};

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
        afterResponse: [
            (request, _options, response) => {
                if (response.status === 401 && request.headers.has('Authorization')) {
                    notifySessionExpired(request);
                }
            },
        ],
    },
    timeout:30000,
});

const multipartApi = ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
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
        afterResponse: [
            (request, _options, response) => {
                if (response.status === 401 && request.headers.has('Authorization')) {
                    notifySessionExpired(request);
                }
            },
        ],
    },
    timeout:30000,
});

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'doctor' | 'staff';
    position_title?: string | null;
};

export type AuthPayload = {
    token_id: string | number;
    token: string;
    token_created_at: string;
    token_expires_at: string;
    user: AuthUser;
};

export interface TemplatePayload {
    name: string;
    description?: string;
    user_id: number;
    test_id: number;
    hospital_id: number;
    department_id?: number | null;
    /** Structured header block definition. Null to clear. */
    header_config?: Record<string, unknown> | null;
}

export interface TemplateFieldPayload {
    template_id: number;
    section: string;
    label: string;
    type: string;
    options?: Record<string, any> | string[] | null;
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
export const updateTemplateField = (
    id: string | number,
    payload: Partial<TemplateFieldPayload>,
) => api.patch(`template-fields/${id}`, { json: payload }).json<any>();
export const deleteTemplateField = (id: string | number) =>
    api.delete(`template-fields/${id}`).json<any>();
export const updateTemplate = (
    id: string | number,
    payload: Partial<TemplatePayload>,
) => api.patch(`templates/${id}`, { json: payload }).json<any>();
export const deleteTemplate = (id: string | number) =>
    api.delete(`templates/${id}`).json<any>();
export const getTests = (params?: Record<string, any>) =>
    api.get('tests', { searchParams: params }).json();

export type TestPayload = {
    code?: string | null;
    name: string;
    type?: string | null;
    description?: string | null;
};

export const getTest = (id: string | number) =>
    api.get(`tests/${id}`).json<any>();
export const createTest = (payload: TestPayload) =>
    api.post('tests', { json: payload }).json<any>();
export const updateTest = (id: string | number, payload: Partial<TestPayload>) =>
    api.put(`tests/${id}`, { json: payload }).json<any>();
export const deleteTest = (id: string | number) =>
    api.delete(`tests/${id}`).json<any>();
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


export type HospitalLogoSlot = 'primary' | 'secondary';

const hospitalLogoPath = (hospitalId: string | number, slot: HospitalLogoSlot) =>
    slot === 'secondary'
        ? `hospitals/${hospitalId}/secondary-logo`
        : `hospitals/${hospitalId}/logo`;

export const uploadHospitalLogo = (hospitalId: string | number, file: File, slot: HospitalLogoSlot = 'primary') => {
    const form = new FormData();
    form.append('logo', file);

    return multipartApi.post(hospitalLogoPath(hospitalId, slot), { body: form }).json<any>();
};

export const deleteHospitalLogo = (hospitalId: string | number, slot: HospitalLogoSlot = 'primary') =>
    multipartApi.delete(hospitalLogoPath(hospitalId, slot)).json<any>();

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

// Feedback
export const createFeedback = (payload: { message: string; page_url?: string }) =>
    api.post('feedback', { json: payload }).json<any>();
export const getFeedbackMessages = (params?: Record<string, any>) =>
    api.get('feedback', { searchParams: params }).json<any>();
export const updateFeedbackMessage = (id: string | number, payload: { status: 'new' | 'reviewed' | 'closed' }) =>
    api.patch(`feedback/${id}`, { json: payload }).json<any>();
export const deleteReport = (id: string | number) =>
    api.delete(`reports/${id}`).json<any>();

export const login = (payload: { email: string; password: string }) =>
    api.post('login', { json: payload }).json<{ status: string; message: string; data: AuthPayload }>();

export const me = () => api.get('me').json<{ status: string; message: string; data: AuthUser }>();

export const forgotPassword = (payload: { email: string }) =>
    api.post('forgot-password', { json: payload }).json<any>();

export const resetPassword = (payload: { email: string; token: string; password: string; password_confirmation: string }) =>
    api.post('reset-password', { json: payload }).json<any>();

export const logout = () => api.post('logout').json<any>();

export default api;


export type HospitalSignatoryPayload = {
    user_id?: number | null;
    name: string;
    position_title?: string | null;
    sip_number?: string | null;
    active?: boolean;
};

// Hospital signatories
export const getHospitalSignatories = (hospitalId: string | number) =>
    api.get(`hospitals/${hospitalId}/signatories`).json<any>();
export const createHospitalSignatory = (hospitalId: string | number, payload: HospitalSignatoryPayload) =>
    api.post(`hospitals/${hospitalId}/signatories`, { json: payload }).json<any>();
export const getHospitalSignatory = (id: string | number) =>
    api.get(`hospital-signatories/${id}`).json<any>();
export const updateHospitalSignatory = (id: string | number, payload: Partial<HospitalSignatoryPayload>) =>
    api.patch(`hospital-signatories/${id}`, { json: payload }).json<any>();
export const deleteHospitalSignatory = (id: string | number) =>
    api.delete(`hospital-signatories/${id}`).json<any>();
export const uploadHospitalSignatorySignature = (id: string | number, file: File) => {
    const form = new FormData();
    form.append('signature', file);
    return multipartApi.post(`hospital-signatories/${id}/signature-image`, { body: form }).json<any>();
};
export const deleteHospitalSignatorySignature = (id: string | number) =>
    multipartApi.delete(`hospital-signatories/${id}/signature-image`).json<any>();

export const uploadTemplateFieldImage = (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    return multipartApi.post('template-field-images', { body: formData }).json<any>();
};
