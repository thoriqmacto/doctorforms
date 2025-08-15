"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// === Types ===
export type Field = {
    id: string;
    attributes: {
        label: string;
        type:
            | "text"
            | "number"
            | "select"
            | "textarea"
            | "title"
            | "image"
            | "checkbox_group"
            | "date";
        options: string[] | null;
        order?: number | null;
        field_group_order?: number | null;
        section?: string | null;
    };
};

type Section = { section: string | null; items: Field[] };

type Props = {
    groupedSections: Section[];
    onSubmit: (values: Record<string, unknown>) => void;
    /** Optional hints to override layout heuristics per section or label */
    layoutHints?: {
        /** Force a section into a specific grid columns template (e.g., "grid-cols-1 md:grid-cols-2 lg:grid-cols-3") */
        sectionCols?: Record<string, string>;
        /** Render these labels full-width (e.g., long textareas) */
        fullWidthLabels?: string[];
        /** Pair fields side-by-side: key is left label, value is right label */
        pairFields?: Record<string, string>;
    };
};

// === Helpers ===
function cx(...xs: (string | false | null | undefined)[]) {
    return xs.filter(Boolean).join(" ");
}
function norm(s: string) {
    return s.replace(/\s+/g, " ").trim();
}

// Well-known labels (only used if present)
const LBL = {
    DOB: "DOB",
    AGE: "Age",
    HEIGHT: "Height (cm)",
    WEIGHT: "Weight (kg)",
    BSA: "BSA (m²)",
} as const;

function duboisBSA(heightCm?: number, weightKg?: number) {
    if (!heightCm || !weightKg) return undefined;
    const bsa = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425);
    return Number.isFinite(bsa) ? Number(bsa.toFixed(2)) : undefined;
}
function calcAgeFromDOB(dobISO?: string) {
    if (!dobISO) return undefined;
    const dob = new Date(dobISO);
    if (isNaN(dob.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : undefined;
}

// Grid heuristics — keyword-driven so it works for other forms too
function gridColsFor(sectionName?: string | null) {
    const s = (sectionName || "").toLowerCase();
    if (/(header|masthead)/.test(s)) return "grid-cols-1";
    if (/(patient|study|demograph|meta)/.test(s)) return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
    if (/(procedure|protocol|prep)/.test(s)) return "grid-cols-2 lg:grid-cols-3";
    if (/(measurement|calculation|2d|m-mode|doppler|hemodynamic|indices)/.test(s)) return "grid-cols-2 md:grid-cols-3";
    if (/(summary|conclusion|comments|impression)/.test(s)) return "grid-cols-1";
    return "grid-cols-1 md:grid-cols-2";
}

// Sort sections by field_group_order (if provided), else keep server order
function sortSections(sections: Section[]) {
    return sections
        .map((sec, i) => {
            const minOrder = Math.min(
                ...sec.items.map((it) => it.attributes.field_group_order ?? Number.POSITIVE_INFINITY)
            );
            return { sec, key: isFinite(minOrder) ? minOrder : 10_000_000 + i };
        })
        .sort((a, b) => a.key - b.key)
        .map((x) => x.sec);
}

export default function TemplateFormRenderer({ groupedSections, onSubmit, layoutHints }: Props) {
    // Zod schema from field types
    const baseShape: Record<string, z.ZodTypeAny> = {};
    groupedSections.forEach((sec) => {
        sec.items.forEach((f) => {
            const name = `f_${f.id}`;
            const t = f.attributes.type;
            if (t === "number") baseShape[name] = z.coerce.number().optional();
            else if (t === "checkbox_group") baseShape[name] = z.array(z.string()).optional();
            else baseShape[name] = z.string().optional(); // text | select | textarea | date | title | image
        });
    });
    const schema = z.object(baseShape);

    const sorted = useMemo(() => sortSections(groupedSections), [groupedSections]);

    const { control, handleSubmit, watch, setValue, getFieldState, formState } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {},
        mode: "onChange",
    });

    // Group fields by field_group_order (used for sentence auto-fill)
    const fieldGroups = useMemo(() => {
        const map = new Map<number, Field[]>();
        groupedSections.forEach((sec) => {
            sec.items.forEach((f) => {
                const key = f.attributes.field_group_order;
                if (key === undefined || key === null) return;
                const arr = map.get(key) ?? [];
                arr.push(f);
                map.set(key, arr);
            });
        });
        return Array.from(map.values()).map((items) =>
            items.sort((a, b) => (a.attributes.order ?? 0) - (b.attributes.order ?? 0))
        );
    }, [groupedSections]);

    // Find fields by label (for helpers, but only if labels exist in the template)
    const byLabel = useMemo(() => {
        const map = new Map<string, string>();
        groupedSections.forEach((sec) =>
            sec.items.forEach((f) => map.set(norm(f.attributes.label), `f_${f.id}`))
        );
        return map;
    }, [groupedSections]);

    const fDOB = byLabel.get(LBL.DOB);
    const fAge = byLabel.get(LBL.AGE);
    const fHt = byLabel.get(LBL.HEIGHT);
    const fWt = byLabel.get(LBL.WEIGHT);
    const fBSA = byLabel.get(LBL.BSA);

    // Auto Age/BSA (doctor can still override)
    const dobVal = watch(fDOB || "");
    const htVal = watch(fHt || "");
    const wtVal = watch(fWt || "");

    useEffect(() => {
        if (fAge && fDOB) {
            const calc = calcAgeFromDOB(dobVal as string | undefined);
            if (typeof calc === "number") setValue(fAge, String(calc), { shouldValidate: false, shouldDirty: true });
        }
    }, [dobVal, fAge, fDOB, setValue]);

    useEffect(() => {
        if (fBSA && fHt && fWt) {
            const bsa = duboisBSA(Number(htVal), Number(wtVal));
            if (typeof bsa === "number") setValue(fBSA, String(bsa), { shouldValidate: false, shouldDirty: true });
        }
    }, [htVal, wtVal, fBSA, fHt, fWt, setValue]);

    // Auto-fill concluding textarea in field groups
    const allVals = watch();
    useEffect(() => {
        fieldGroups.forEach((items) => {
            if (items.length < 2) return;
            const last = items[items.length - 1];
            if (last.attributes.type !== "textarea") return;

            const textareaName = `f_${last.id}`;
            const parts: string[] = [];
            items.slice(0, -1).forEach((f) => {
                const name = `f_${f.id}`;
                const val = (allVals as any)[name];
                if (Array.isArray(val)) {
                    if (val.length) parts.push(`${f.attributes.label}: ${val.join(", ")}`);
                } else if (val !== undefined && val !== null && String(val).trim() !== "") {
                    parts.push(`${f.attributes.label}: ${val}`);
                }
            });
            const sentence = parts.join(". ") + (parts.length ? "." : "");
            const curr = (allVals as any)[textareaName];
            if (!getFieldState(textareaName, formState).isDirty && curr !== sentence) {
                setValue(textareaName, sentence, { shouldDirty: false, shouldValidate: false });
            }
        });
    }, [allVals, fieldGroups, formState, getFieldState, setValue]);

    // ---- Renderers ----
    function renderSectionHeader(title?: string | null) {
        if (!title) return null;
        return (
            <div className="sticky top-0 z-10 -mx-4 mb-2 bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:relative print:top-auto print:-mx-0 print:px-0">
                <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
            </div>
        );
    }

    function renderField(f: Field) {
        const name = `f_${f.id}`;
        const t = f.attributes.type;
        const label = f.attributes.label;
        const fullWidth =
            !!layoutHints?.fullWidthLabels?.some((x) => x.toLowerCase() === label.toLowerCase()) ||
            t === "textarea" ||
            t === "image" ||
            t === "title";

        if (t === "title") {
            return (
                <h3 key={name} className="col-span-full mt-2 text-base font-medium">
                    {label}
                </h3>
            );
        }

        if (t === "image") {
            return (
                <div key={name} className="space-y-1 col-span-full">
                    <Label>{label}</Label>
                    <div className="text-sm text-muted-foreground">Image upload not implemented.</div>
                </div>
            );
        }

        if (t === "select") {
            return (
                <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                    <Label>{label}</Label>
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(f.attributes.options ?? []).map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            );
        }

        if (t === "textarea") {
            return (
                <div key={name} className="space-y-1 col-span-full">
                    <Label>{label}</Label>
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => <Textarea {...field} value={field.value as string | undefined} rows={3} />}
                    />
                </div>
            );
        }

        if (t === "checkbox_group") {
            const options = f.attributes.options ?? [];
            return (
                <div key={name} className="space-y-2 col-span-full">
                    <Label className="font-medium">{label}</Label>
                    <Controller
                        control={control}
                        name={name}
                        defaultValue={[]}
                        render={({ field }) => (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {options.map((opt) => {
                                    const checked = Array.isArray(field.value) && field.value.includes(opt);
                                    return (
                                        <label key={opt} className="inline-flex items-center gap-2 rounded border p-2 hover:bg-muted/30">
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={(v) => {
                                                    const curr = new Set<string>(Array.isArray(field.value) ? field.value : []);
                                                    if (v) curr.add(opt);
                                                    else curr.delete(opt);
                                                    field.onChange(Array.from(curr));
                                                }}
                                            />
                                            <span className="text-sm leading-tight">{opt}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    />
                </div>
            );
        }

        if (t === "date") {
            return (
                <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                    <Label>{label}</Label>
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => <Input type="date" {...field} value={(field.value as string | undefined) ?? ""} />}
                    />
                </div>
            );
        }

        // text | number
        return (
            <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                <Label>{label}</Label>
                <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                        <Input type={t === "number" ? "number" : "text"} {...field} value={field.value as string | number | undefined} />
                    )}
                />
            </div>
        );
    }

    function SectionCard({ title, children }: { title?: string | null; children: React.ReactNode }) {
        const hintCols = title ? layoutHints?.sectionCols?.[title] : undefined;
        const cols = hintCols ?? gridColsFor(title);
        return (
            <section className="rounded-xl border p-4 shadow-sm print:shadow-none">
                {renderSectionHeader(title)}
                <div className={cx("grid gap-3", cols)}>{children}</div>
            </section>
        );
    }

    // Patient/Study-like sections: compact, common fields first if present
    function renderPatientStudy(sec: Section) {
        const wanted = new Set(
            [
                "Study Date",
                "MRN",
                LBL.DOB,
                LBL.AGE,
                "Gender",
                "First Write Time",
                "Last Write Time",
                LBL.HEIGHT,
                LBL.WEIGHT,
                LBL.BSA,
                "Blood Pressure (mmHg)",
            ].map(norm)
        );

        const prioritized = [
            ...sec.items.filter((f) => wanted.has(norm(f.attributes.label))),
            ...sec.items.filter((f) => !wanted.has(norm(f.attributes.label))),
        ];

        return <SectionCard title={sec.section}>{prioritized.map((f) => renderField(f))}</SectionCard>;
    }

    // “Procedure-like” sections: support pairing of related fields if found in any template
    function renderProcedureLike(sec: Section) {
        const pairs: Array<{ left: string; right: string }> = [];
        if (layoutHints?.pairFields) {
            for (const [left, right] of Object.entries(layoutHints.pairFields)) pairs.push({ left, right });
        } else {
            pairs.push({ left: "Complication", right: "Complication (details)" });
            pairs.push({ left: "Anesthesia", right: "Sedation" });
        }

        const used = new Set<Field>();
        const rows: React.ReactNode[] = [];

        pairs.forEach(({ left, right }) => {
            const L = sec.items.find((f) => norm(f.attributes.label) === norm(left));
            const R = sec.items.find((f) => norm(f.attributes.label) === norm(right));
            if (L && R) {
                used.add(L);
                used.add(R);
                rows.push(
                    <React.Fragment key={`${left}-${right}`}>
                        <div>{renderField(L)}</div>
                        <div>{renderField(R)}</div>
                    </React.Fragment>
                );
            }
        });

        const rest = sec.items.filter((f) => !used.has(f));
        return (
            <SectionCard title={sec.section}>
                {rows}
                {rest.map((f) => renderField(f))}
            </SectionCard>
        );
    }

    // Default section renderer
    function renderGeneric(sec: Section) {
        const items = [...sec.items].sort((a, b) => (a.attributes.order ?? 0) - (b.attributes.order ?? 0));
        return <SectionCard title={sec.section}>{items.map((f) => renderField(f))}</SectionCard>;
    }

    function renderSection(sec: Section) {
        const name = (sec.section || "").toLowerCase();
        if (/(patient|study|demograph|meta)/.test(name)) return renderPatientStudy(sec);
        if (/(procedure|protocol|prep)/.test(name)) return renderProcedureLike(sec);
        return renderGeneric(sec);
    }

    return (
        <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-4 print:space-y-2">
            {/* A4 inner padding to mimic PDF framing */}
            <div className="mx-auto max-w-[210mm] space-y-4 p-2 md:p-4">
                {sorted.map((sec, idx) => (
                    <div key={idx}>{renderSection(sec)}</div>
                ))}

                <div className="flex gap-2 pt-2 print:hidden">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="secondary" onClick={() => window.print()} className="no-print">
                        Print
                    </Button>
                </div>
            </div>
        </form>
    );
}
