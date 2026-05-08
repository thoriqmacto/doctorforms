"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import { deleteHospitalLogo, HospitalLogoSlot, uploadHospitalLogo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    hospitalId: number | string;
    slot: HospitalLogoSlot;
    currentUrl?: string | null;
    label?: string;
    onUploaded?: () => void;
    onDeleted?: () => void;
};

export default function HospitalLogoUploader({ hospitalId, slot, currentUrl, label, onUploaded, onDeleted }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedPreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    const previewUrl = selectedPreview ?? currentUrl ?? null;

    function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        setError(null);
        setFile(e.target.files?.[0] ?? null);
    }

    async function onUpload() {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            await uploadHospitalLogo(hospitalId, file, slot);
            setFile(null);
            onUploaded?.();
        } catch (e: any) {
            setError(e?.response ? `Upload failed (${e.response.status})` : e?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    }

    async function onDeleteUploaded() {
        setLoading(true);
        setError(null);
        try {
            await deleteHospitalLogo(hospitalId, slot);
            setFile(null);
            onDeleted?.();
        } catch (e: any) {
            setError(e?.response ? `Delete failed (${e.response.status})` : e?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium">{label ?? (slot === 'secondary' ? 'Secondary logo' : 'Primary logo')}</p>
            {previewUrl ? (
                <img src={previewUrl} alt={`${slot} logo preview`} className="h-20 w-20 rounded-md border object-contain p-1" />
            ) : (
                <div className="grid h-20 w-20 place-items-center rounded-md border text-xs text-muted-foreground">No preview</div>
            )}
            {currentUrl ? <Input value={currentUrl} readOnly /> : <p className="text-sm text-muted-foreground">No uploaded logo yet.</p>}
            <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} />
            <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onUpload} disabled={!file || loading}>
                    {loading ? 'Uploading...' : 'Upload'}
                </Button>
                {currentUrl ? (
                    <Button type="button" variant="outline" onClick={onDeleteUploaded} disabled={loading}>
                        Clear uploaded image
                    </Button>
                ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    );
}
