'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getMyPreferences, updateMyPreferences } from '@/lib/api';
import {
    loadColumnPrefs,
    reconcileColumnPrefs,
    saveColumnPrefs,
    type ColumnDef,
    type ColumnPrefs,
} from '@/lib/listTable';

/**
 * Build the `users.preferences` key for a list-table scope. Kept here so the
 * web client is the single source of truth for what shape lives in the JSON
 * column — the server treats the payload as opaque.
 */
function prefKey(scope: string): string {
    return `list_columns_${scope}`;
}

/**
 * DB-persisted column visibility/order for a list table.
 *
 * - On mount, hydrates from localStorage so the table renders without a
 *   blocking spinner. Once `/me/preferences` resolves, server values
 *   override (server is the source of truth across browsers).
 * - On change, writes through to local state immediately, mirrors to
 *   localStorage (so the next reload doesn't flicker), and debounces a
 *   PATCH to the server.
 * - If the user is unauthenticated, the PATCH fails silently; localStorage
 *   alone keeps the UI working.
 *
 * The `storageKey` is preserved as a legacy fallback so users who already
 * have prefs cached in localStorage from before this change don't lose them
 * on first login after the upgrade.
 */
export function useColumnPrefs(
    scope: string,
    defaults: ColumnDef[],
    storageKey: string,
): [ColumnPrefs, (next: ColumnPrefs) => void] {
    const [prefs, setPrefs] = useState<ColumnPrefs>(() =>
        loadColumnPrefs(storageKey, defaults),
    );

    const { data } = useSWR(
        ['/me/preferences'],
        () => getMyPreferences().then((r) => r.data),
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        },
    );

    // Once server prefs arrive, prefer them over the localStorage seed.
    const serverHydratedRef = useRef(false);
    useEffect(() => {
        if (!data || serverHydratedRef.current) return;
        const stored = (data as Record<string, unknown>)[prefKey(scope)];
        if (stored !== undefined && stored !== null) {
            const reconciled = reconcileColumnPrefs(stored, defaults);
            setPrefs(reconciled);
            saveColumnPrefs(storageKey, reconciled);
        }
        serverHydratedRef.current = true;
    }, [data, scope, defaults, storageKey]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSyncedRef = useRef<string | null>(null);

    const update = useCallback(
        (next: ColumnPrefs) => {
            setPrefs(next);
            saveColumnPrefs(storageKey, next);

            const serialized = JSON.stringify(next);
            if (serialized === lastSyncedRef.current) return;

            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                lastSyncedRef.current = serialized;
                updateMyPreferences({ [prefKey(scope)]: next }).catch(() => {
                    // Network/auth failures fall through to the local cache.
                    lastSyncedRef.current = null;
                });
            }, 400);
        },
        [scope, storageKey],
    );

    // Flush any pending PATCH on unmount.
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return [prefs, update];
}
