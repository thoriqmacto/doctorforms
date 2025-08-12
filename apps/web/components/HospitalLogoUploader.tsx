"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

type Props = {
  hospitalId: number | string;
  authToken?: string;
  onUploaded?: (url: string) => void;
};

export default function HospitalLogoUploader({ hospitalId, authToken, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch(`/api/v1/hospitals/${hospitalId}/logo`, {
        method: "POST",
        body: form,
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const url = json?.data?.attributes?.logo_url ?? "";
      if (onUploaded && url) onUploaded(url);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} />
        <button onClick={upload} disabled={!file || loading} className="px-3 py-1 rounded-md border">
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
      {preview && <img src={preview} alt="Preview" className="max-w-[240px] h-auto border rounded-md p-2" />}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
