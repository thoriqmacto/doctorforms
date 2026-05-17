/**
 * Echo OCR measurement recogniser.
 *
 * Given the raw text Tesseract pulls off an echo screenshot and the
 * measurement template fields for the section, try to suggest values
 * for the common TTE parameters (LVIDd, EF, TAPSE, ...). The matching
 * is intentionally conservative — we'd rather under-suggest than push
 * a wrong number into a clinical form. The UI never auto-applies the
 * suggestions; the doctor copies or types them in.
 *
 * Matching priority per field:
 *   1) options.image_extraction_aliases (admin-curated)
 *   2) options.measurement_name
 *   3) field.attributes.label
 *   4) Built-in echo aliases keyed by the field's measurement_name
 *      (BUILTIN_ECHO_ALIASES below).
 *
 * The first alias that produces a sensible numeric value wins per
 * field; if multiple fields point at the same alias, each gets its
 * own suggestion.
 */

export type MeasurementFieldLike = {
    id: string | number;
    attributes: {
        label: string;
        options?: unknown;
    };
};

export type EchoSuggestion = {
    templateFieldId: number;
    fieldKey: string;
    measurementName: string;
    label: string;
    value: string;
    unit?: string;
    sourceText?: string;
    confidence: 'high' | 'medium' | 'low';
};

/**
 * Aliases the OCR'd text might use for each canonical TTE parameter.
 * Keys are normalised (uppercased, whitespace collapsed) versions of
 * what a template author would type into measurement_name (or what
 * appears as the field label).
 */
const BUILTIN_ECHO_ALIASES: Record<string, string[]> = {
    BSA: ['BSA'],
    IVSD: ['IVSd', 'IVS-d', 'IVS,d', 'IVS_d', 'IVS d', 'IVSD'],
    LVIDD: ['LVIDd', 'LVEDD', 'LVID-d', 'LVID,d', 'LVID_d', 'LVID d', 'LVIDD'],
    LVEDD: ['LVEDD', 'LVIDd', 'LVID-d', 'LVID,d', 'LVID_d', 'LVIDD'],
    LVIDS: ['LVIDs', 'LVESD', 'LVID-s', 'LVID,s', 'LVID_s', 'LVID s', 'LVIDS'],
    LVESD: ['LVESD', 'LVIDs', 'LVID-s', 'LVID,s', 'LVID_s', 'LVIDS'],
    LVPWD: ['LVPWd', 'LVPW-d', 'LVPW,d', 'LVPW_d', 'LVPW d', 'LVPWD', 'PWd', 'PWD'],
    EF: ['LVEF', 'EF', 'Ejection Fraction'],
    LVEF: ['LVEF', 'EF', 'Ejection Fraction'],
    FS: ['FS', 'Fractional Shortening', 'LV%FS'],
    LA: ['LA size', 'LA diameter', 'LAD', 'LA'],
    LAD: ['LAD', 'LA size', 'LA diameter', 'LA'],
    'AO ROOT': ['Ao Root', 'AoR', 'Aortic Root', 'Aorta root', 'AoRoot'],
    AOROOT: ['Ao Root', 'AoR', 'Aortic Root', 'Aorta root', 'AoRoot'],
    RVDD: ['RVDd', 'RVD-d', 'RVD,d', 'RVD_d', 'RVDD', 'RV diameter'],
    TAPSE: ['TAPSE'],
    RA: ['RA size', 'RA area', 'RA diameter'],
    'MV E': ['MV E', 'Mitral E', 'MV-E'],
    MVE: ['MV E', 'Mitral E', 'MV-E'],
    'MV A': ['MV A', 'Mitral A', 'MV-A'],
    MVA: ['MV A', 'Mitral A', 'MV-A'],
    'E/A': ['E/A', 'E:A', 'MV E/A'],
    DT: ['DT', 'Deceleration Time'],
    "E/E'": ["E/e'", 'E/Ea', 'E/E_'],
    'AV VMAX': ['AV Vmax', 'AoV Vmax', 'Ao Vmax', 'Aortic Vmax'],
    'AV PG': ['AV PG', 'AoV PG', 'AV peak gradient', 'Aortic PG'],
    'AV MG': ['AV MG', 'AoV MG', 'AV mean gradient', 'Aortic MG'],
    'LVOT DIAMETER': ['LVOT diameter', 'LVOT d', 'LVOTd'],
    LVOT: ['LVOT diameter', 'LVOT d', 'LVOTd'],
    'LVOT VTI': ['LVOT VTI', 'LVOT-VTI', 'LVOTVTI', 'VTI LVOT'],
    'TR VMAX': ['TR Vmax', 'TRVmax', 'TR V max'],
    'TR PG': ['TR PG', 'TRPG', 'TR peak gradient'],
    RVSP: ['RVSP', 'PASP'],
    PASP: ['PASP', 'RVSP'],
};

function normalizeKey(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getOptions(field: MeasurementFieldLike): Record<string, unknown> {
    const opts = field.attributes?.options;
    if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
        return opts as Record<string, unknown>;
    }
    return {};
}

function readAliasArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0);
}

/** Aliases to try for a given field, ordered most-specific first. */
function aliasesForField(field: MeasurementFieldLike): {
    alias: string;
    tier: 'admin' | 'measurement_name' | 'label' | 'builtin';
}[] {
    const options = getOptions(field);
    const measurementName =
        typeof options.measurement_name === 'string' && options.measurement_name.trim()
            ? (options.measurement_name as string).trim()
            : '';
    const label = typeof field.attributes?.label === 'string' ? field.attributes.label : '';

    const seen = new Set<string>();
    const out: { alias: string; tier: 'admin' | 'measurement_name' | 'label' | 'builtin' }[] = [];
    const push = (alias: string, tier: 'admin' | 'measurement_name' | 'label' | 'builtin') => {
        const cleaned = alias.replace(/\s+/g, ' ').trim();
        if (!cleaned) return;
        const k = cleaned.toUpperCase();
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ alias: cleaned, tier });
    };

    for (const a of readAliasArray(options.image_extraction_aliases)) push(a, 'admin');
    if (measurementName) push(measurementName, 'measurement_name');
    if (label) push(label, 'label');

    const lookupKeys = [measurementName, label]
        .map((s) => (typeof s === 'string' ? normalizeKey(s) : ''))
        .filter(Boolean);
    for (const key of lookupKeys) {
        const builtins = BUILTIN_ECHO_ALIASES[key];
        if (builtins) for (const a of builtins) push(a, 'builtin');
    }

    // Sort by alias length descending so longer/more-specific aliases
    // try first ("LVOT diameter" before "LVOT").
    out.sort((a, b) => b.alias.length - a.alias.length);
    return out;
}

type AliasHit = { value: string; unit: string; sourceText: string };

/** Find the first plausible numeric value following `alias` in `rawText`. */
function findAliasHit(rawText: string, alias: string): AliasHit | null {
    const aliasPattern = alias.split(/\s+/).map(escapeRegex).join('\\s+');
    const re = new RegExp(
        // Boundary on both sides to avoid matching inside another
        // token. Lookahead is used instead of \b because aliases may
        // end in non-word characters (e.g. "E/e'"). The unit must stay
        // on the same line as the value, so the gap between number and
        // unit is "[ \t]*" — newlines break the unit out.
        `(^|[^A-Za-z0-9])(${aliasPattern})(?=$|[^A-Za-z0-9])\\s*[:=]?\\s*(-?\\d+(?:[.,]\\d+)?)[ \\t]*([A-Za-z%°²/'·]{0,6})`,
        'gi',
    );

    let m: RegExpExecArray | null;
    while ((m = re.exec(rawText)) !== null) {
        const numRaw = m[3];
        const unitRaw = (m[4] ?? '').trim();
        const valueStr = numRaw.replace(',', '.');
        const value = parseFloat(valueStr);
        if (!Number.isFinite(value)) continue;

        const matchStart = m.index + (m[1]?.length ?? 0);
        const matchEnd = m.index + m[0].length;

        // Heuristic rejections:
        // - Heart rate ("HR 78 bpm").
        if (/^bpm$/i.test(unitRaw)) continue;
        // - Year-like 4-digit ints with no unit ("2024", "Date 2024 ...").
        if (!unitRaw && /^\d{4}$/.test(numRaw) && value >= 1900 && value <= 2100) continue;
        // - Date trailing a value ("12/03/2024", "01-02-2024"). Look at
        //   the text immediately after the value+unit slice for a date
        //   separator followed by digits.
        const tail = rawText.slice(matchEnd, matchEnd + 8);
        if (!unitRaw && /^\s*[\/\-]\s*\d/.test(tail)) continue;
        // - Negative measurements rarely make clinical sense here.
        if (value < 0) continue;

        const sourceText = rawText.slice(matchStart, matchEnd).replace(/\s+/g, ' ').trim();
        return { value: valueStr, unit: unitRaw, sourceText };
    }
    return null;
}

function normalizeUnit(unit: string): string {
    return unit.replace(/\s+/g, '').toLowerCase();
}

/**
 * If the OCR'd unit and the template unit are both lengths but disagree
 * (mm vs cm), convert. Anything else passes through unchanged.
 */
function reconcileUnit(
    valueStr: string,
    ocrUnit: string,
    templateUnit: string,
): { value: string; usedTemplateUnit: boolean } {
    const ocr = normalizeUnit(ocrUnit);
    const tpl = normalizeUnit(templateUnit);
    if (!ocr || !tpl || ocr === tpl) return { value: valueStr, usedTemplateUnit: ocr === tpl };

    const num = parseFloat(valueStr);
    if (!Number.isFinite(num)) return { value: valueStr, usedTemplateUnit: false };

    if (ocr === 'cm' && tpl === 'mm') {
        return { value: trimFloat(num * 10), usedTemplateUnit: true };
    }
    if (ocr === 'mm' && tpl === 'cm') {
        return { value: trimFloat(num / 10), usedTemplateUnit: true };
    }
    return { value: valueStr, usedTemplateUnit: false };
}

function trimFloat(n: number): string {
    // Round to 3 decimals, then strip trailing zeros so "48" stays "48"
    // and "4.83" stays "4.83".
    const s = n.toFixed(3);
    return s.replace(/\.?0+$/, '');
}

function confidenceFor(
    tier: 'admin' | 'measurement_name' | 'label' | 'builtin',
    hasUnit: boolean,
    unitMatchesTemplate: boolean,
    hasTemplateUnit: boolean,
): EchoSuggestion['confidence'] {
    const strongTier = tier === 'admin' || tier === 'measurement_name';
    // "goodUnit" — the OCR'd unit (or its absence) is consistent with
    // what the template expects. Ratios like E/A / E/e' have no
    // template unit so the absence of an OCR unit is also fine.
    const goodUnit = hasUnit ? unitMatchesTemplate : !hasTemplateUnit;

    if (strongTier && goodUnit) return 'high';
    if (strongTier) return 'medium';
    if (tier === 'builtin' && goodUnit) return 'medium';
    if (tier === 'label' && goodUnit) return 'medium';
    return 'low';
}

export function recognizeEchoMeasurements(
    rawText: string,
    measurementFields: MeasurementFieldLike[],
): EchoSuggestion[] {
    if (!rawText || typeof rawText !== 'string') return [];
    if (!Array.isArray(measurementFields) || measurementFields.length === 0) return [];

    // Normalise narrow / non-breaking spaces (U+00A0, U+202F, U+2009)
    // that Tesseract occasionally emits between a value and its unit.
    const cleanedText = rawText.replace(/[   ]/g, ' ');
    const out: EchoSuggestion[] = [];

    for (const field of measurementFields) {
        const fieldId = Number(field.id);
        if (!Number.isFinite(fieldId)) continue;
        const aliases = aliasesForField(field);
        if (aliases.length === 0) continue;

        let chosen: { hit: AliasHit; tier: 'admin' | 'measurement_name' | 'label' | 'builtin' } | null = null;
        for (const { alias, tier } of aliases) {
            const hit = findAliasHit(cleanedText, alias);
            if (hit) {
                chosen = { hit, tier };
                break;
            }
        }
        if (!chosen) continue;

        const options = getOptions(field);
        const templateUnit =
            typeof options.measurement_unit === 'string' ? (options.measurement_unit as string).trim() : '';
        const { value, usedTemplateUnit } = reconcileUnit(chosen.hit.value, chosen.hit.unit, templateUnit);

        const ocrUnitN = normalizeUnit(chosen.hit.unit);
        const tplUnitN = normalizeUnit(templateUnit);
        const unitMatchesTemplate =
            ocrUnitN === tplUnitN || usedTemplateUnit || (ocrUnitN === '' && !tplUnitN);

        const measurementName =
            typeof options.measurement_name === 'string' && (options.measurement_name as string).trim()
                ? (options.measurement_name as string).trim()
                : field.attributes.label;

        const confidence = confidenceFor(
            chosen.tier,
            chosen.hit.unit.length > 0,
            unitMatchesTemplate,
            tplUnitN.length > 0,
        );

        out.push({
            templateFieldId: fieldId,
            fieldKey: `f_${fieldId}`,
            measurementName,
            label: field.attributes.label,
            value,
            unit: usedTemplateUnit ? templateUnit : chosen.hit.unit || templateUnit || undefined,
            sourceText: chosen.hit.sourceText,
            confidence,
        });
    }

    // Sort: high → medium → low, then by label for stable display.
    const rank: Record<EchoSuggestion['confidence'], number> = { high: 0, medium: 1, low: 2 };
    out.sort((a, b) => rank[a.confidence] - rank[b.confidence] || a.label.localeCompare(b.label));
    return out;
}

/** For "Copy all suggestions". */
export function formatSuggestionsAsText(suggestions: EchoSuggestion[]): string {
    if (!suggestions.length) return '';
    return suggestions
        .map((s) => {
            const unit = s.unit ? ` ${s.unit}` : '';
            return `${s.label}: ${s.value}${unit} (${s.confidence})`;
        })
        .join('\n');
}
