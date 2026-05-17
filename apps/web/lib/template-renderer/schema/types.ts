/**
 * Canonical TypeScript types for the template rendering schema.
 *
 * Pipeline context:
 *   TemplateController (PHP) → TemplateResource → grouped_sections
 *     → createTemplateViewModel (TemplateEngine.ts)
 *     → buildReportRenderPlan (renderPlan.ts)
 *     → HtmlView.tsx  /  generateTemplatePdf()
 *
 * This module is the single source of truth for the shape of:
 *   - FieldType: the enum for template_fields.type
 *   - FieldOptions: the parsed shape of template_fields.options JSON
 *   - Binding: entity-reference descriptor that lives inside options.binding
 *   - HeaderConfig: templates.header_config JSON
 *   - style tokens (align, font, weight, margin, imageSize)
 *
 * Keep in sync with:
 *   apps/api/app/Support/EntityBindingCatalog.php
 *   apps/api/database/migrations/*_expand_template_field_type_enum*.php
 *   apps/api/database/migrations/*_add_header_config_and_department_to_templates.php
 */

export type FieldType =
    | 'text'
    | 'number'
    | 'select'
    | 'textarea'
    | 'title'
    | 'subtitle'
    | 'image'
    | 'checkbox_group'
    | 'date'
    | 'bullseye'
    | 'patient'
    | 'user'
    | 'measurement';

export type SectionKind =
    | 'header'
    | 'measurements'
    | 'findings'
    | 'conclusion'
    | 'signature'
    | 'general';

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

export type BindingSource =
    | 'hospital'
    | 'patient'
    | 'user'
    | 'report'
    | 'signatory'
    | 'test'
    | 'literal';

/**
 * Describes how to resolve a value from a domain entity at render time.
 * `literal` is a verbatim string; other sources resolve via bindings.ts.
 */
export type Binding =
    | { source: Exclude<BindingSource, 'literal'>; path: string; format?: string }
    | { source: 'literal'; value: string };

// ---------------------------------------------------------------------------
// Style tokens (shared by HTML and PDF renderers)
// ---------------------------------------------------------------------------

export type AlignToken = 'left' | 'center' | 'right';
export type FontSizeToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type FontWeightToken = 'normal' | 'bold';
export type SpacingToken = 'none' | 'xs' | 'sm' | 'md' | 'lg';
export type ImageSizeToken = 'sm' | 'md' | 'lg' | 'xl';

// ---------------------------------------------------------------------------
// Field options (one parsed shape for the whole app)
// ---------------------------------------------------------------------------

export type TextareaMode = 'free' | 'result';

export type FieldStyle = {
    align?: AlignToken;
    tone?: 'default' | 'muted' | 'accent';
    emphasis?: 'none' | 'bold' | 'italic' | 'underline';
    size?: FontSizeToken;
};

/**
 * Fully typed projection of template_fields.options.
 * Any downstream consumer must use parseFieldOptions() to build this;
 * direct JSON indexing is a bug surface and is no longer accepted.
 */
export type FieldOptions = {
    values: string[];                // select/checkbox_group options
    default: string;                 // default value (or image URL / etc.)
    required: boolean;
    static: boolean;
    style: FieldStyle;
    textareaMode: TextareaMode;
    titleTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    imageUrl: string;
    imageAlign: AlignToken;
    imageSize?: ImageSizeToken;
    showSectionName: boolean;
    measurementName: string;
    measurementUnit: string;
    measurementCategory: string;
    binding?: Binding;
    /**
     * textarea_free can opt-in to a second, optional textarea (e.g. for a
     * subtitle line under the primary content). The label and emphasis are
     * authored on the template; the toggle/value lives in the report.
     */
    extraTextareaEnabled: boolean;
    extraTextareaLabel: string;
    extraTextareaEmphasis: 'normal' | 'italic' | 'bold' | 'muted';
    /** Pass-through bucket for anything the codec doesn't yet model. */
    extra?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Header block config (templates.header_config)
// ---------------------------------------------------------------------------

export type HeaderLayout = 'three-col' | 'two-col' | 'centered';

export type HeaderLineStyle = {
    font?: FontSizeToken;
    weight?: FontWeightToken;
    align?: AlignToken;
    uppercase?: boolean;
    marginTop?: SpacingToken;
};

/**
 * One line in the reusable hospital header block. Exactly one of
 * `binding` (entity-resolved at render time), `template` (placeholder-driven)
 * or `literal` (verbatim) may be provided.
 */
export type HeaderLine = HeaderLineStyle & {
    id?: string;
    binding?: Binding;
    template?: string;
    literal?: string;
    visible?: boolean;
};

export type HeaderLogoSlot = {
    binding?: Binding;        // typically { source: 'hospital', path: 'logo_url' }
    size?: ImageSizeToken;
    visible?: boolean;
};

export type HeaderConfig = {
    layout: HeaderLayout;
    logo: {
        left?: HeaderLogoSlot;
        right?: HeaderLogoSlot;
    };
    lines: HeaderLine[];
    divider?: { visible?: boolean; thicknessPt?: number };
};

// ---------------------------------------------------------------------------
// Contexts injected at render time
// ---------------------------------------------------------------------------

export type HospitalContext = {
    name?: string;
    short_name?: string;
    parent_org_line?: string;
    address?: string;
    address_line_1?: string;
    address_line_2?: string;
    province?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    fax?: string;
    whatsapp_phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
    secondary_logo_url?: string;
    accreditation_text?: string;
    report_footer_line?: string;
};

export type PatientContext = {
    name?: string;
    mrn?: string;
    gender?: string;
    dob?: string;
    dos?: string;
    age?: number | string;
    height_cm?: number | string;
    weight_kg?: number | string;
    bsa?: number | string;
    blood_pressure?: string;
    diagnosis_brief?: string;
    referring_physician?: string;
};

export type UserContext = {
    name?: string;
    email?: string;
    phone?: string;
    position_title?: string;
};

/**
 * Alias retained so the renderPlan module can keep its historical
 * `operator` terminology while binding resolution uses `user` as the
 * canonical source. Both refer to the same shape.
 */
export type OperatorContext = UserContext;

export type ReportContext = {
    title?: string;
    findings?: string;
    conclusion?: string;
    operator?: string;
    supervisor?: string;
    device?: string;
};

export type SignatoryContext = {
    name?: string;
    position_title?: string;
    sip_number?: string;
    signature_image_url?: string;
};

export type TestContext = {
    code?: string;
    name?: string;
    type?: string;
    description?: string;
};

export type RenderContexts = {
    hospital?: HospitalContext;
    patient?: PatientContext;
    user?: UserContext;
    report?: ReportContext;
    signatory?: SignatoryContext;
    test?: TestContext;
};
