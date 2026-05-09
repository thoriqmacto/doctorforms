'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { getHospitalSignatories } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/assetUrl';

export type SignatoryOption = {
    id: number;
    name?: string;
    position_title?: string | null;
    sip_number?: string | null;
    active?: boolean;
    user_id?: number | null;
    signature_image_url?: string | null;
};

type Props = {
    hospitalId: number | null | undefined;
    value: number | null;
    onChange: (signatoryId: number | null) => void;
    /** when set, used to auto-pick a matching signatory if exactly one matches */
    patientUserId?: number | null;
    label?: string;
    helperText?: string;
};

function buildLabel(s: SignatoryOption): string {
    return [s.name?.trim(), s.position_title?.trim(), s.sip_number ? `SIP ${s.sip_number}` : null]
        .filter(Boolean)
        .join(' — ');
}

export default function SignatorySelector({
    hospitalId,
    value,
    onChange,
    patientUserId,
    label = 'Report Signatory',
    helperText,
}: Props) {
    const { data, error, isLoading } = useSWR(
        hospitalId ? ['/hospitals/signatories', hospitalId] : null,
        () => getHospitalSignatories(hospitalId as number),
    );

    const signatories: SignatoryOption[] = useMemo(() => {
        const raw = data?.data ?? [];
        if (!Array.isArray(raw)) return [];
        return raw
            .map((row: any) => ({
                id: Number(row.id),
                ...(row.attributes ?? {}),
            }))
            .filter((s: SignatoryOption) => s.active !== false);
    }, [data]);

    const selected = useMemo(
        () => signatories.find((s) => s.id === value) ?? null,
        [signatories, value],
    );

    const signatureSrc = resolveAssetUrl(selected?.signature_image_url);
    const [signatureBroken, setSignatureBroken] = useState(false);

    useEffect(() => {
        setSignatureBroken(false);
    }, [signatureSrc]);

    useEffect(() => {
        if (!hospitalId) return;
        if (value !== null && signatories.some((s) => s.id === value)) return;
        if (signatories.length === 0) return;

        if (patientUserId != null) {
            const match = signatories.find((s) => s.user_id != null && Number(s.user_id) === Number(patientUserId));
            if (match) {
                onChange(match.id);
                return;
            }
        }
        if (signatories.length === 1) {
            onChange(signatories[0].id);
        }
    }, [hospitalId, signatories, value, patientUserId, onChange]);

    return (
        <div className="space-y-2 rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-900" htmlFor="signatory-select">
                    {label}
                </label>
                {isLoading ? <span className="text-xs text-slate-500">Loading…</span> : null}
            </div>
            {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
            {error ? (
                <p className="text-xs text-destructive">Unable to load signatories for this hospital.</p>
            ) : null}
            <select
                id="signatory-select"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={value === null ? '' : String(value)}
                onChange={(event) => {
                    const next = event.target.value;
                    onChange(next ? Number(next) : null);
                }}
                disabled={!hospitalId || isLoading}
            >
                <option value="">No signatory / no signature</option>
                {signatories.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                        {buildLabel(s) || `Signatory #${s.id}`}
                    </option>
                ))}
            </select>
            {selected ? (
                <div className="flex items-start gap-3 rounded-md bg-slate-50 p-2 text-xs">
                    {signatureSrc && !signatureBroken ? (
                        <Image
                            src={signatureSrc}
                            alt="Signature preview"
                            width={120}
                            height={48}
                            unoptimized
                            onError={() => setSignatureBroken(true)}
                            className="h-12 w-auto object-contain"
                        />
                    ) : signatureSrc && signatureBroken ? (
                        <div className="text-slate-500">Signature image could not be loaded.</div>
                    ) : (
                        <div className="text-slate-500">
                            Selected signatory has no uploaded signature.
                        </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                        {selected.name ? <span className="font-semibold">{selected.name}</span> : null}
                        {selected.position_title ? <span>{selected.position_title}</span> : null}
                        {selected.sip_number ? <span>SIP: {selected.sip_number}</span> : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
