/**
 * One parser and one serializer for template_fields.options JSON.
 *
 * Before this module, three separate places (TemplateFieldResource on the
 * backend, TemplateEngine.ts, and the template edit page) each rolled their
 * own options-normalization. Any divergence meant subtle bugs. All web
 * consumers now go through parseFieldOptions() / serializeFieldOptions().
 */

import type {
    AlignToken,
    Binding,
    BindingSource,
    FieldOptions,
    FieldStyle,
    FontSizeToken,
    ImageSizeToken,
    TextareaMode,
} from './types';
import { isValidBindingPath } from './bindings';

const DEFAULT_STYLE: FieldStyle = {};

const DEFAULT_OPTIONS: FieldOptions = {
    values: [],
    default: '',
    required: false,
    static: false,
    style: DEFAULT_STYLE,
    textareaMode: 'free',
    titleTag: 'h2',
    imageUrl: '',
    imageAlign: 'center',
    imageSize: undefined,
    showSectionName: true,
    measurementName: '',
    measurementUnit: '',
    measurementCategory: '',
    binding: undefined,
    extra: undefined,
};

function toStringOrEmpty(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
}

function toAlign(value: unknown, fallback: AlignToken = 'center'): AlignToken {
    const raw = String(value ?? '').toLowerCase();
    return raw === 'left' || raw === 'right' || raw === 'center' ? (raw as AlignToken) : fallback;
}

function toFontSize(value: unknown): FontSizeToken | undefined {
    const raw = String(value ?? '').toLowerCase();
    return raw === 'xs' || raw === 'sm' || raw === 'md' || raw === 'lg' || raw === 'xl'
        ? (raw as FontSizeToken)
        : undefined;
}

function toImageSize(value: unknown): ImageSizeToken | undefined {
    const raw = String(value ?? '').toLowerCase();
    return raw === 'sm' || raw === 'md' || raw === 'lg' || raw === 'xl'
        ? (raw as ImageSizeToken)
        : undefined;
}

function parseStyle(raw: unknown): FieldStyle {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const obj = raw as Record<string, unknown>;
    const out: FieldStyle = {};

    const align = toAlign(obj.align, 'center');
    if (align) out.align = align;

    const tone = String(obj.tone ?? '').toLowerCase();
    if (tone === 'muted' || tone === 'accent' || tone === 'default') out.tone = tone;

    const emphasis = String(obj.emphasis ?? '').toLowerCase();
    if (emphasis === 'bold' || emphasis === 'italic' || emphasis === 'underline' || emphasis === 'none') {
        out.emphasis = emphasis;
    }

    const size = toFontSize(obj.size);
    if (size) out.size = size;

    return out;
}

function parseBinding(raw: unknown): Binding | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const obj = raw as Record<string, unknown>;
    const source = String(obj.source ?? '').toLowerCase() as BindingSource;

    if (source === 'literal') {
        return { source: 'literal', value: toStringOrEmpty(obj.value) };
    }

    const validSources: BindingSource[] = ['hospital', 'patient', 'user', 'report', 'signatory', 'test'];
    if (!validSources.includes(source)) return undefined;

    const path = toStringOrEmpty(obj.path);
    if (!path || !isValidBindingPath(source, path)) return undefined;

    const format = obj.format !== undefined && obj.format !== null ? String(obj.format) : undefined;
    return format ? { source, path, format } : { source, path };
}

/**
 * Parse a raw template_fields.options value into a typed FieldOptions.
 * Accepts the full zoo of shapes the app has produced over time:
 *   - null / undefined
 *   - array of strings (legacy: treated as select values)
 *   - JSON-encoded string
 *   - object
 */
export function parseFieldOptions(raw: unknown): FieldOptions {
    if (raw === null || raw === undefined) return { ...DEFAULT_OPTIONS };

    if (typeof raw === 'string') {
        try {
            return parseFieldOptions(JSON.parse(raw));
        } catch {
            return { ...DEFAULT_OPTIONS };
        }
    }

    if (Array.isArray(raw)) {
        return {
            ...DEFAULT_OPTIONS,
            values: raw.map((value) => String(value)),
        };
    }

    if (typeof raw !== 'object') return { ...DEFAULT_OPTIONS };

    const obj = raw as Record<string, unknown>;

    const values = Array.isArray(obj.values)
        ? obj.values.map((v) => String(v))
        : Array.isArray(obj.options)
          ? obj.options.map((v) => String(v))
          : [];

    const textareaMode: TextareaMode = obj.textarea_mode === 'result' ? 'result' : 'free';
    const titleTagRaw = String(obj.title_tag ?? '').toLowerCase();
    const titleTag: FieldOptions['titleTag'] = (
        titleTagRaw === 'h1' ||
        titleTagRaw === 'h2' ||
        titleTagRaw === 'h3' ||
        titleTagRaw === 'h4' ||
        titleTagRaw === 'h5' ||
        titleTagRaw === 'h6'
    )
        ? (titleTagRaw as FieldOptions['titleTag'])
        : 'h2';

    const styleFromOptions = parseStyle(obj.style);
    // Legacy fallbacks: older templates used image_align / align at the root.
    const legacyImageAlign = obj.image_align !== undefined ? toAlign(obj.image_align) : undefined;
    const legacyAlign = obj.align !== undefined ? toAlign(obj.align) : undefined;
    const style: FieldStyle = {
        ...styleFromOptions,
        align: styleFromOptions.align ?? legacyImageAlign ?? legacyAlign,
    };

    const showSectionName = obj.show_section_name === false || obj.showSectionName === false ? false : true;

    const binding = parseBinding(obj.binding);

    return {
        values,
        default: toStringOrEmpty(obj.default),
        required: !!obj.required,
        static: !!obj.static,
        style,
        textareaMode,
        titleTag,
        imageUrl: toStringOrEmpty(obj.image_url),
        imageAlign: style.align ?? legacyImageAlign ?? 'center',
        imageSize: toImageSize(obj.image_size),
        showSectionName,
        measurementName: toStringOrEmpty(obj.measurement_name),
        measurementUnit: toStringOrEmpty(obj.measurement_unit),
        measurementCategory: toStringOrEmpty(obj.measurement_category),
        binding,
    };
}

/**
 * Serialize typed FieldOptions back to the JSON shape the API accepts.
 * Only emits keys that carry information so existing templates don't
 * accumulate empty-string noise on round-trip.
 */
export function serializeFieldOptions(options: FieldOptions): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (options.values.length) out.values = options.values;
    if (options.default) out.default = options.default;
    if (options.required) out.required = true;
    if (options.static) out.static = true;

    const style: Record<string, unknown> = {};
    if (options.style.align) style.align = options.style.align;
    if (options.style.tone) style.tone = options.style.tone;
    if (options.style.emphasis) style.emphasis = options.style.emphasis;
    if (options.style.size) style.size = options.style.size;
    if (Object.keys(style).length) out.style = style;

    if (options.textareaMode === 'result') out.textarea_mode = 'result';
    if (options.titleTag && options.titleTag !== 'h2') out.title_tag = options.titleTag;

    if (options.imageUrl) out.image_url = options.imageUrl;
    if (options.imageSize) out.image_size = options.imageSize;

    if (!options.showSectionName) out.show_section_name = false;

    if (options.measurementName) out.measurement_name = options.measurementName;
    if (options.measurementUnit) out.measurement_unit = options.measurementUnit;
    if (options.measurementCategory) out.measurement_category = options.measurementCategory;

    if (options.binding) {
        out.binding = options.binding.source === 'literal'
            ? { source: 'literal', value: options.binding.value }
            : {
                source: options.binding.source,
                path: options.binding.path,
                ...(options.binding.format ? { format: options.binding.format } : {}),
            };
    }

    return out;
}

export { DEFAULT_OPTIONS };
