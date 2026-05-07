import type {
    OperatorContext,
    PatientContext,
    ReportContext,
    SignatoryContext,
    TestContext,
} from '@/lib/template-renderer/schema';

export const mockPreviewPatient: PatientContext = {
    name: 'Sample Patient',
    mrn: 'MR-000001',
    gender: 'Male',
    dob: '1990-01-01',
    age: 36,
    dos: new Date().toISOString(),
    height_cm: 170,
    weight_kg: 70,
    bsa: 1.82,
    blood_pressure: '120/80 mmHg',
    diagnosis_brief: 'Sample diagnosis for preview only',
    referring_physician: 'Dr. Sample Referrer',
};

export const mockPreviewReport: ReportContext = {
    title: 'Sample Report',
    operator: 'Dr. Sample Operator',
    supervisor: 'Dr. Sample Supervisor',
    device: 'Sample Device',
};

export const mockPreviewOperator: OperatorContext = {
    name: 'Dr. Sample Operator',
    position_title: 'Sample Specialist',
};

export const mockPreviewSignatory: SignatoryContext = {
    name: 'Dr. Sample Signatory',
    position_title: 'Sample Consultant',
    sip_number: 'SIP.000000',
};

export const mockPreviewTest: TestContext = {
    name: 'Sample Test',
};
