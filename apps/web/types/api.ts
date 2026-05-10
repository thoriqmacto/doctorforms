export type TemplateField = {
    type: 'template_fields';
    id: string;
    attributes: {
        section: string | null;
        label: string;
        type: 'text' | 'number' | 'select' | 'textarea' | 'title' | 'image';
        options: Record<string, any> | string[] | null;
        order: number;
        field_group_order: number;
        required?: boolean;
    };
};

export type GroupedSection = {
    section: string | null;
    items: TemplateField[];
};

export type TestResource = {
    type: 'tests';
    id: string;
    attributes: {
        code: string;
        name: string;
        type: string;
        description: string | null;
    };
};

export type TemplateResource = {
    type: 'templates';
    id: string;
    attributes: {
        name: string;
        description: string | null;
        is_enabled?: boolean;
    };
    relationships?: {
        test?: { data: { type: 'tests'; id: string } | null };
        hospital?: { data: { type: 'hospitals'; id: string } | null };
    };
    meta?: {
        page?: {
            size: 'A4';
            width_mm: number;
            height_mm: number;
            margins_mm: { top: number; right: number; bottom: number; left: number };
        };
        grouped_sections?: GroupedSection[] | null;
    };
};

export type TemplatesIndexResponse = {
    data: TemplateResource[];
    included?: (TestResource | HospitalResource)[];
    meta?: any;
};

export type TemplateShowResponse = {
    data: TemplateResource;
    included?: (TestResource | HospitalResource | TemplateField)[];
    meta?: any;
};

export type PatientPayload = {
    template_id: number;
    hospital_id: number;
    user_id: number;
    test_id?: number;
    values: Record<string, string | number | null>;
};

export type HospitalResource = {
    type: 'hospitals';
    id: string;
    attributes: {
        name: string;
        address: string;
        phone?: string | null;
        email?: string | null;
    };
};

export type HospitalsIndexResponse = {
    data: HospitalResource[];
};

export type HospitalShowResponse = {
    data: HospitalResource;
};
