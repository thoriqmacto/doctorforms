/**
 * Tiny helpers for the list-table pages (/reports, /patients).
 *
 * These pages share the same UX surface — global search, column sort,
 * pagination, and per-user column visibility — so they share the same
 * tiny primitives here. No new package is introduced.
 */

export type SortDescriptor = {
    field: string;
    direction: 'asc' | 'desc';
};

export function parseSort(value: string | null | undefined, defaultField: string): SortDescriptor {
    const raw = (value ?? '').trim();
    if (!raw) return { field: defaultField, direction: 'desc' };
    if (raw.startsWith('-')) return { field: raw.slice(1), direction: 'desc' };
    return { field: raw, direction: 'asc' };
}

export function serializeSort(sort: SortDescriptor): string {
    return sort.direction === 'desc' ? `-${sort.field}` : sort.field;
}

/**
 * Build a URLSearchParams-compatible object for the backend list
 * endpoints. The controllers accept both bracket and flat-key forms,
 * but the bracket form is the idiomatic Laravel one.
 */
export function buildListQuery(input: {
    q?: string;
    sort?: SortDescriptor;
    page?: number;
    pageSize?: number;
    extraFilters?: Record<string, string | number | boolean | undefined | null>;
}): Record<string, string> {
    const out: Record<string, string> = {};
    if (input.q && input.q.trim().length > 0) {
        out['filter[q]'] = input.q.trim();
    }
    if (input.sort) {
        out.sort = serializeSort(input.sort);
    }
    if (input.page && input.page > 0) {
        out.page = String(input.page);
    }
    if (input.pageSize && input.pageSize > 0) {
        out['page[size]'] = String(input.pageSize);
    }
    for (const [key, value] of Object.entries(input.extraFilters ?? {})) {
        if (value === undefined || value === null || value === '') continue;
        out[`filter[${key}]`] = String(value);
    }
    return out;
}

/**
 * Per-user column visibility and order, persisted to localStorage so
 * the same user keeps their layout across page reloads.
 *
 * `defaults` defines the canonical column order. `state` is what the
 * user changed (visibility, plus an optional reorder list).
 */
export type ColumnDef<K extends string = string> = {
    key: K;
    label: string;
    defaultVisible?: boolean;
};

export type ColumnPrefs = {
    visible: Record<string, boolean>;
    order: string[];
};

export function loadColumnPrefs(storageKey: string, defaults: ColumnDef[]): ColumnPrefs {
    if (typeof window === 'undefined') {
        return {
            visible: Object.fromEntries(defaults.map((c) => [c.key, c.defaultVisible !== false])),
            order: defaults.map((c) => c.key),
        };
    }
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {
                visible: Object.fromEntries(defaults.map((c) => [c.key, c.defaultVisible !== false])),
                order: defaults.map((c) => c.key),
            };
        }
        const parsed = JSON.parse(raw) as Partial<ColumnPrefs>;
        const knownKeys = new Set(defaults.map((c) => c.key));
        const visible = Object.fromEntries(
            defaults.map((c) => [c.key, parsed.visible?.[c.key] ?? c.defaultVisible !== false]),
        );
        const order = Array.isArray(parsed.order)
            ? parsed.order
                  .filter((k) => knownKeys.has(k))
                  .concat(defaults.map((c) => c.key).filter((k) => !parsed.order!.includes(k)))
            : defaults.map((c) => c.key);
        return { visible, order };
    } catch {
        return {
            visible: Object.fromEntries(defaults.map((c) => [c.key, c.defaultVisible !== false])),
            order: defaults.map((c) => c.key),
        };
    }
}

export function saveColumnPrefs(storageKey: string, prefs: ColumnPrefs): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
        // swallow — column prefs are best-effort
    }
}
