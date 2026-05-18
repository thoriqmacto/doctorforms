import { z } from 'zod';

/**
 * TemplateExportV1 — the portable JSON envelope for a single Template
 * plus its fields (and their bindings). The backend mirror is
 * apps/api/app/Services/Templates/TemplateExportService.php.
 *
 * Field identity is (section, label). DB ids are intentionally absent
 * — the import endpoint always creates a NEW disabled template and
 * recomputes unique_name from (section, label).
 *
 * Foreign keys (user_id, test_id, hospital_id, department_id) live
 * inside `template` and are used as-is on import. If they don't resolve
 * in the target database the import 422s; the import dialog lets the
 * user override them before submission.
 */

const FIELD_TYPES = [
    'text',
    'number',
    'select',
    'textarea',
    'subtitle',
    'title',
    'image',
    'date',
    'checkbox_group',
    'bullseye',
    'patient',
    'user',
    'measurement',
] as const;

export const TemplateExportFieldSchema = z.object({
    section: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    options: z.record(z.string(), z.any()).nullable().optional(),
    order: z.number().int().optional(),
    field_group_order: z.number().int().optional(),
    unique_name: z.string().optional(),
});

export const TemplateExportTemplateSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    user_id: z.number().int().positive(),
    test_id: z.number().int().positive(),
    hospital_id: z.number().int().positive(),
    department_id: z.number().int().positive().nullable().optional(),
    header_config: z.record(z.string(), z.any()).nullable().optional(),
    layout_config: z.record(z.string(), z.any()).nullable().optional(),
});

export const TemplateExportSectionSchema = z.object({
    name: z.string(),
    kind: z.string().optional(),
});

export const TemplateExportV1Schema = z.object({
    version: z.literal('TemplateExportV1'),
    exported_at: z.string().optional(),
    template: TemplateExportTemplateSchema,
    sections: z.array(TemplateExportSectionSchema).optional(),
    fields: z.array(TemplateExportFieldSchema),
});

export type TemplateExportField = z.infer<typeof TemplateExportFieldSchema>;
export type TemplateExportTemplate = z.infer<typeof TemplateExportTemplateSchema>;
export type TemplateExportV1 = z.infer<typeof TemplateExportV1Schema>;
