"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import {
    BullseyeWallMotion,
    makeDefaultBullseye,
    type BullseyeValue,
} from "@/components/form/BullseyeWallMotion";
import {
    parseFieldOptions,
    resolveBinding,
    type RenderContexts,
} from "@/lib/template-renderer/schema";

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
            | "date"
            | "bullseye"
            | "patient"
            | "user"
            | "measurement";
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
    showSubmitButton?: boolean;
    showPrintButton?: boolean;
    onPrint?: () => void;
    layoutHints?: {
        sectionCols?: Record<string, string>;
        fullWidthLabels?: string[];
        pairFields?: Record<string, string>;
    };
    initialValues?: Record<string, unknown>;
    hideStaticRequiredLabelAndInput?: boolean;
    editHref?: string;
    viewHref?: string;
    viewLabel?: string;
    viewLinks?: Array<{ href: string; label: string }>;
    enableSectionControls?: boolean;
    onRefresh?: () => void | Promise<void>;
    showRefreshButton?: boolean;
    lastRefreshedAt?: Date | null;
    showDirtyState?: boolean;
    warnOnLeaveWithUnsavedChanges?: boolean;
    autosaveDraftKey?: string;
    autosaveIntervalMs?: number;
    /**
     * Entity contexts for resolving options.binding on bound fields
     * (patient/user/hospital/...). When a field carries a binding, its
     * rendered value is resolved from these contexts rather than report
     * storage. See lib/template-renderer/schema/bindings.ts.
     */
    contexts?: RenderContexts;
};

type FieldOptionMeta = {
    defaultValue: string;
    required: boolean;
    static: boolean;
    textareaMode: "free" | "result";
    style: Record<string, string>;
};

type AutoResultGroup = {
    textareaName: string;
    inputFields: Field[];
    inputFieldNames: string[];
};

function cx(...xs: (string | false | null | undefined)[]) {
    return xs.filter(Boolean).join(" ");
}
function norm(s: string) {
    return s.replace(/\s+/g, " ").trim();
}

function optionList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value && typeof value === "object") {
        const options = (value as { options?: unknown }).options;
        if (Array.isArray(options)) return options.map((item) => String(item));
        const values = (value as { values?: unknown }).values;
        if (Array.isArray(values)) return values.map((item) => String(item));
    }
    return [];
}

function parseFieldOptionMeta(value: unknown): FieldOptionMeta {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            defaultValue: "",
            required: false,
            static: false,
            textareaMode: "free",
            style: {},
        };
    }

    const options = value as {
        default?: unknown;
        required?: unknown;
        static?: unknown;
        textarea_mode?: unknown;
        style?: unknown;
    };

    return {
        defaultValue: options.default ? String(options.default) : "",
        required: !!options.required,
        static: !!options.static,
        textareaMode: options.textarea_mode === "result" ? "result" : "free",
        style:
            options.style && typeof options.style === "object" && !Array.isArray(options.style)
                ? Object.fromEntries(
                    Object.entries(options.style as Record<string, unknown>).map(([k, v]) => [k, String(v)])
                )
                : {},
    };
}

function staticFieldClassName(style: Record<string, string>) {
    const align = style.align?.toLowerCase();
    const tone = style.tone?.toLowerCase();
    const emphasis = style.emphasis?.toLowerCase();
    const size = style.size?.toLowerCase();

    return cx(
        "text-sm text-foreground",
        align === "center" && "text-center",
        align === "right" && "text-right",
        tone === "muted" && "text-muted-foreground",
        tone === "accent" && "text-primary",
        emphasis === "bold" && "font-semibold",
        emphasis === "italic" && "italic",
        emphasis === "underline" && "underline",
        size === "sm" && "text-xs",
        size === "lg" && "text-base",
        size === "xl" && "text-lg"
    );
}

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

function gridColsFor(sectionName?: string | null) {
    const s = (sectionName || "").toLowerCase();
    if (/(header|masthead)/.test(s)) return "grid-cols-1";
    if (/(patient|study|demograph|meta)/.test(s)) return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
    if (/(procedure|protocol|prep)/.test(s)) return "grid-cols-2 lg:grid-cols-3";
    if (/(measurement|calculation|2d|m-mode|doppler|hemodynamic|indices)/.test(s)) return "grid-cols-2 md:grid-cols-3";
    if (/(summary|conclusion|comments|impression)/.test(s)) return "grid-cols-1";
    return "grid-cols-1 md:grid-cols-2";
}

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

function sectionDomId(title: string | null | undefined, idx: number) {
    const base = (title || `section-${idx}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `template-section-${idx}-${base}`;
}

function formatFindingsGroupLabel(raw: string) {
    const value = raw.trim();
    const match = value.match(/^0*(\d+)_+(.+)$/);
    if (match) {
        const [, numericPart, groupTitle] = match;
        return `${Number(numericPart)}. ${groupTitle.replace(/_/g, " ").trim()}`;
    }
    return value.replace(/_/g, " ").trim();
}

function formatSectionTitle(title: string | null | undefined) {
    if (!title) return title;
    const trimmed = title.trim();
    if (!/^findings_/i.test(trimmed)) return trimmed;

    const suffix = trimmed.replace(/^findings_/i, "");
    return `Findings - ${formatFindingsGroupLabel(suffix)}`;
}

export default function TemplateFormRenderer({
    groupedSections,
    onSubmit,
    showSubmitButton = true,
    showPrintButton = true,
    onPrint,
    layoutHints,
    initialValues,
    hideStaticRequiredLabelAndInput = false,
    editHref,
    viewHref,
    viewLabel = "View",
    viewLinks = [],
    enableSectionControls = false,
    onRefresh,
    showRefreshButton = false,
    lastRefreshedAt = null,
    showDirtyState = false,
    warnOnLeaveWithUnsavedChanges = false,
    autosaveDraftKey,
    autosaveIntervalMs = 15000,
    contexts,
}: Props) {
    const schema = useMemo(() => {
        const baseShape: Record<string, z.ZodTypeAny> = {};
        groupedSections.forEach((sec) => {
            sec.items.forEach((f) => {
                const name = `f_${f.id}`;
                const t = f.attributes.type;
                if (t === "number") baseShape[name] = z.coerce.number().optional();
                else if (t === "checkbox_group") baseShape[name] = z.array(z.string()).optional();
                else if (t === "bullseye") baseShape[name] = z.any().optional();
                else baseShape[name] = z.string().optional();
            });
        });
        return z.object(baseShape);
    }, [groupedSections]);
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;
    // console.log("TemplateFormRenderer render:", renderCountRef.current);

    const sorted = useMemo(() => sortSections(groupedSections), [groupedSections]);
    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
    const [jumpSection, setJumpSection] = useState<string>("");
    const sectionLayoutKey = useMemo(
        () => sorted.map((sec, idx) => `${idx}:${sec.section ?? ""}:${sec.items.length}`).join("|"),
        [sorted]
    );

    const { control, handleSubmit, setValue, reset, getValues, formState: { isDirty } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: initialValues || {},
        mode: "onChange",
    });

    const initialValuesHash = useMemo(() => JSON.stringify(initialValues ?? {}), [initialValues]);
    const lastInitialValuesHashRef = useRef<string>(initialValuesHash);

    useEffect(() => {
        if (initialValuesHash === lastInitialValuesHashRef.current) return;
        lastInitialValuesHashRef.current = initialValuesHash;
        reset(initialValues ?? {});
    }, [initialValues, initialValuesHash, reset]);

    useEffect(() => {
        if (!warnOnLeaveWithUnsavedChanges || !isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty, warnOnLeaveWithUnsavedChanges]);

    useEffect(() => {
        if (!autosaveDraftKey) return;
        if (typeof window === "undefined") return;
        if (!initialValues) return;

        try {
            const raw = window.localStorage.getItem(autosaveDraftKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { values?: Record<string, unknown> };
            if (!parsed?.values || typeof parsed.values !== "object") return;
            reset({ ...(initialValues ?? {}), ...(parsed.values ?? {}) });
        } catch (error) {
            console.error("Failed to restore autosave draft", error);
        }
    }, [autosaveDraftKey, initialValues, reset]);

    useEffect(() => {
        if (!autosaveDraftKey) return;
        if (typeof window === "undefined") return;

        const interval = window.setInterval(() => {
            if (!isDirty) return;
            const payload = {
                savedAt: new Date().toISOString(),
                values: getValues(),
            };
            try {
                window.localStorage.setItem(autosaveDraftKey, JSON.stringify(payload));
            } catch (error) {
                console.error("Failed to autosave draft", error);
            }
        }, autosaveIntervalMs);

        return () => window.clearInterval(interval);
    }, [autosaveDraftKey, autosaveIntervalMs, getValues, isDirty]);

    useEffect(() => {
        if (!enableSectionControls) return;
        if (sorted.length === 0) return;
        setCollapsedSections(
            Object.fromEntries(sorted.map((_section, idx) => [idx, idx !== 0]))
        );
    }, [enableSectionControls, sectionLayoutKey, sorted]);

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

    const dobVal = useWatch({ control, name: fDOB || "" });
    const htVal = useWatch({ control, name: fHt || "" });
    const wtVal = useWatch({ control, name: fWt || "" });

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

    const autoResultGroups = useMemo(() => {
        const groups: AutoResultGroup[] = [];

        const priorityByType: Partial<Record<Field["attributes"]["type"], number>> = {
            checkbox_group: 0,
            textarea: 1,
        };

        fieldGroups.forEach((items) => {
            if (items.length < 2) return;

            const resultTextarea = items.find((item) => {
                if (item.attributes.type !== "textarea") return false;
                const itemMeta = parseFieldOptionMeta(item.attributes.options);
                return itemMeta.textareaMode === "result";
            });

            if (!resultTextarea) return;

            const inputFields = items
                .filter((item) => item.id !== resultTextarea.id)
                .sort((a, b) => {
                    const typeA = priorityByType[a.attributes.type] ?? 99;
                    const typeB = priorityByType[b.attributes.type] ?? 99;
                    if (typeA !== typeB) return typeA - typeB;
                    return (a.attributes.order ?? 0) - (b.attributes.order ?? 0);
                });

            groups.push({
                textareaName: `f_${resultTextarea.id}`,
                inputFields,
                inputFieldNames: inputFields.map((field) => `f_${field.id}`),
            });
        });
        return groups;
    }, [fieldGroups]);

    const autoResultWatchFieldNames = useMemo(
        () => autoResultGroups.flatMap((group) => group.inputFieldNames),
        [autoResultGroups]
    );
    const autoResultWatchValues = useWatch({ control, name: autoResultWatchFieldNames });
    const autoResultSourceValsByGroup = useMemo(() => {
        let offset = 0;
        return autoResultGroups.map((group) => {
            const nextValues = autoResultWatchValues.slice(offset, offset + group.inputFieldNames.length);
            offset += group.inputFieldNames.length;
            return nextValues;
        });
    }, [autoResultGroups, autoResultWatchValues]);
    const lastAutoSentenceByFieldRef = useRef<Record<string, string>>({});
    useEffect(() => {
        autoResultGroups.forEach((group, groupIndex) => {
            const watchedValues = autoResultSourceValsByGroup[groupIndex];
            const parts: string[] = [];
            group.inputFields.forEach((field, inputIndex) => {
                const val = Array.isArray(watchedValues) ? watchedValues[inputIndex] : undefined;
                if (Array.isArray(val)) {
                    if (val.length) parts.push(`${val.join(", ")}`);
                } else if (val !== undefined && val !== null && String(val).trim() !== "") {
                    parts.push(`${val}`);
                }
            });
            // const sentence = parts.join(" ") + (parts.length ? "." : "");
            const sentence = parts.join(" ");
            const curr = getValues(group.textareaName);
            const lastAutoSentence = lastAutoSentenceByFieldRef.current[group.textareaName] ?? "";
            const userHasEdited =
                curr !== undefined &&
                curr !== null &&
                String(curr) !== "" &&
                String(curr) !== lastAutoSentence;
            const canReplace = !userHasEdited;

            if (canReplace && curr !== sentence) {
                setValue(group.textareaName, sentence, { shouldDirty: false, shouldValidate: false });
                lastAutoSentenceByFieldRef.current[group.textareaName] = sentence;
            }

            if (!canReplace && curr !== sentence) {
                lastAutoSentenceByFieldRef.current[group.textareaName] = String(curr ?? "");
            } else if (curr === sentence) {
                lastAutoSentenceByFieldRef.current[group.textareaName] = sentence;
            }
        });
    }, [autoResultGroups, autoResultSourceValsByGroup, getValues, setValue]);

    function renderSectionHeader(title: string | null | undefined, idx: number, collapsed: boolean) {
        if (!title) return null;
        const displayTitle = formatSectionTitle(title);
        return (
            <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center justify-between gap-2 bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:relative print:top-auto print:-mx-0 print:px-0">
                <h2 className="text-lg font-semibold tracking-wide">{displayTitle}</h2>
                {enableSectionControls && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setCollapsedSections((prev) => ({ ...prev, [idx]: !collapsed }))}
                        className="print:hidden"
                    >
                        {collapsed ? "Expand" : "Collapse"}
                    </Button>
                )}
            </div>
        );
    }

    function renderField(f: Field) {
        const name = `f_${f.id}`;
        const fieldInputId = `template-field-${f.id}`;
        const t = f.attributes.type;
        const label = f.attributes.label;
        const optionMeta = parseFieldOptionMeta(f.attributes.options);
        const fullWidth =
            !!layoutHints?.fullWidthLabels?.some((x) => x.toLowerCase() === label.toLowerCase()) ||
            t === "textarea" ||
            t === "image" ||
            t === "title" ||
            t === "bullseye";
        const fieldLabel = optionMeta.required ? `${label} *` : label;
        const showValidationHints = () => {
            const hints: string[] = [];
            if (optionMeta.required) hints.push("Required");
            if (t === "number") hints.push("Numbers only");
            if (t === "date") hints.push("Format: YYYY-MM-DD");

            if (
                f.attributes?.type === "measurement" &&
                f.attributes.options &&
                typeof f.attributes.options === "object" &&
                !Array.isArray(f.attributes.options)
            ) {
                const options = f.attributes.options as Record<string, unknown>;
                if (options.measurement_unit) hints.push(`Unit: ${String(options.measurement_unit)}`);
                if (options.format) hints.push(`Format: ${String(options.format)}`);
            }

            if (hints.length === 0) return null;
            return <p className="text-xs text-muted-foreground">{hints.join(" • ")}</p>;
        };

        if (hideStaticRequiredLabelAndInput && optionMeta.static && optionMeta.required) {
            return (
                <div key={name} className={fullWidth ? "col-span-full" : undefined}>
                    <p className={staticFieldClassName(optionMeta.style)}>{optionMeta.defaultValue}</p>
                </div>
            );
        }

        if (t === "title") {
            return (
                <h3 key={name} className="col-span-full mt-2 text-base font-medium">
                    {label}
                </h3>
            );
        }

        if (t === "image") {
            const imageSrc = String(getValues(name) ?? optionMeta.defaultValue ?? "").trim();
            return (
                <div key={name} className="space-y-1 col-span-full">
                    <Label>{label}</Label>
                    {showValidationHints()}
                    {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageSrc} alt={label} className="max-h-80 w-full rounded-md border object-contain" />
                    ) : (
                        <div className="text-sm text-muted-foreground">No image available.</div>
                    )}
                </div>
            );
        }

        if (t === "bullseye") {
            return (
                <div key={name} className="space-y-1 col-span-full">
                    <Label htmlFor={fieldInputId}>{label}</Label>
                    {showValidationHints()}
                    <Controller
                        control={control}
                        name={name}
                        defaultValue={makeDefaultBullseye()}
                        render={({ field }) => (
                            <BullseyeWallMotion
                                value={(field.value as BullseyeValue) ?? makeDefaultBullseye()}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>
            );
        }

        if (t === "patient" || t === "user") {
            // Bound field path:
            //   - template_fields.options.binding.{source,path} → entity value
            //   - we pre-fill the input with the resolved value
            //   - input stays editable so doctors can override when necessary
            //     (per plan priority: editable where practical)
            const parsed = parseFieldOptions(f.attributes.options);
            const resolved = contexts
                ? resolveBinding(parsed.binding, contexts)
                : undefined;

            return (
                <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                    <Label htmlFor={fieldInputId}>{fieldLabel}</Label>
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => {
                            const currentValue = (field.value as string | undefined) ?? "";
                            const displayValue = currentValue || resolved || "";
                            return (
                                <>
                                    <Input
                                        id={fieldInputId}
                                        type="text"
                                        value={displayValue}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        placeholder={resolved ?? ""}
                                    />
                                    {resolved && currentValue && currentValue !== resolved ? (
                                        <p className="text-xs text-muted-foreground">
                                            Overridden — default is “{resolved}”.{" "}
                                            <button
                                                type="button"
                                                className="underline"
                                                onClick={() => field.onChange("")}
                                            >
                                                revert
                                            </button>
                                        </p>
                                    ) : parsed.binding ? (
                                        <p className="text-xs text-muted-foreground">
                                            Auto-filled from {parsed.binding.source === "literal" ? "literal" : `${parsed.binding.source}.${parsed.binding.path}`}
                                        </p>
                                    ) : null}
                                </>
                            );
                        }}
                    />
                </div>
            );
        }

        if (t === "select") {
            const selectOptions = optionList(f.attributes.options);
            return (
                <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                    <Label htmlFor={fieldInputId}>{label}</Label>
                    {showValidationHints()}
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={(field.value as string | undefined) ?? ""}>
                                <SelectTrigger id={fieldInputId} aria-label={label}>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectOptions.map((opt) => (
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
            const isTextareaResult = optionMeta.textareaMode === "result";
            return (
                <div
                    key={name}
                    className="space-y-1 col-span-full"
                    // onFocus={() => console.log("focus:", name)}
                >
                    <Label htmlFor={fieldInputId}>{label}</Label>
                    {showValidationHints()}
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => (
                            <Textarea
                                id={fieldInputId}
                                {...field}
                                value={(field.value as string | undefined) ?? ""}
                                rows={3}
                                disabled={isTextareaResult}
                            />
                        )}
                    />
                </div>
            );
        }

        if (t === "checkbox_group") {
            const options = optionList(f.attributes.options);
            const groupLabelId = `${fieldInputId}-legend`;
            return (
                <div key={name} className="space-y-2 col-span-full">
                    <Label id={groupLabelId} className="font-medium">{fieldLabel}</Label>
                    {showValidationHints()}
                    <Controller
                        control={control}
                        name={name}
                        defaultValue={[]}
                        render={({ field }) => (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {options.map((opt) => {
                                    const checked = Array.isArray(field.value) && field.value.includes(opt);
                                    const optionId = `${fieldInputId}-option-${opt
                                        .toLowerCase()
                                        .replace(/[^a-z0-9]+/g, "-")
                                        .replace(/^-|-$/g, "")}`;
                                    return (
                                        <label htmlFor={optionId} key={opt} className="inline-flex items-center gap-2 rounded border p-2 hover:bg-muted/30">
                                            <Checkbox
                                                id={optionId}
                                                name={`${name}[]`}
                                                aria-labelledby={groupLabelId}
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

        if (t === "measurement") {
            return (
                <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                    <Label htmlFor={fieldInputId}>{fieldLabel}</Label>
                    {showValidationHints()}
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => (
                            <Input id={fieldInputId} type="text" {...field} value={(field.value as string | undefined) ?? ""} />
                        )}
                    />
                </div>
            );
        }

        if (t === "date") {
            return (
                <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                    <Label htmlFor={fieldInputId}>{fieldLabel}</Label>
                    {showValidationHints()}
                    <Controller
                        control={control}
                        name={name}
                        render={({ field }) => <Input id={fieldInputId} type="date" {...field} value={(field.value as string | undefined) ?? ""} />}
                    />
                </div>
            );
        }

        return (
            <div key={name} className={fullWidth ? "space-y-1 col-span-full" : "space-y-1"}>
                <Label htmlFor={fieldInputId}>{fieldLabel}</Label>
                {showValidationHints()}
                <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                        <Input
                            id={fieldInputId}
                            type={t === "number" ? "number" : "text"}
                            {...field}
                            value={(field.value as string | number | undefined) ?? ""}
                        />
                    )}
                />
            </div>
        );
    }

    function renderSectionCard(
        title: string | null | undefined,
        idx: number,
        children: React.ReactNode
    ) {
        const hintCols = title ? layoutHints?.sectionCols?.[title] : undefined;
        const cols = hintCols ?? gridColsFor(title);
        const collapsed = !!collapsedSections[idx];

        return (
            <section
                id={sectionDomId(title, idx)}
                className="scroll-mt-24 rounded-xl border p-4 shadow-sm print:shadow-none"
            >
                {renderSectionHeader(title, idx, collapsed)}
                {!collapsed && <div className={cx("grid gap-3", cols)}>{children}</div>}
            </section>
        );
    }

    function renderPatientStudy(sec: Section, idx: number) {
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

        return renderSectionCard(
            sec.section,
            idx,
            prioritized.map((f) => renderField(f))
        );
    }

    function renderProcedureLike(sec: Section, idx: number) {
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
        return renderSectionCard(
            sec.section,
            idx,
            <>
                {rows}
                {rest.map((f) => renderField(f))}
            </>
        );
    }

    function renderGeneric(sec: Section, idx: number) {
        const items = [...sec.items].sort((a, b) => (a.attributes.order ?? 0) - (b.attributes.order ?? 0));
        return renderSectionCard(
            sec.section,
            idx,
            items.map((f) => renderField(f))
        );
    }

    function renderSection(sec: Section, idx: number) {
        const name = (sec.section || "").toLowerCase();
        if (/(patient|study|demograph|meta)/.test(name)) return renderPatientStudy(sec, idx);
        if (/(procedure|protocol|prep)/.test(name)) return renderProcedureLike(sec, idx);
        return renderGeneric(sec, idx);
    }

    const visibleSections = sorted.map((sec, idx) => ({
        idx,
        title: formatSectionTitle(sec.section) || `Section ${idx + 1}`,
        id: sectionDomId(sec.section, idx),
    }));
    const resolvedViewLinks = viewLinks.length > 0
        ? viewLinks
        : viewHref
          ? [{ href: viewHref, label: viewLabel }]
          : [];

    return (
        <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-4 print:space-y-2">
            <div className="mx-auto w-full max-w-[1100px] space-y-4 p-2 md:p-4 print:max-w-[210mm]">
                {enableSectionControls && (
                    <div className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur print:hidden">
                        {showDirtyState && (
                            <div className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                                {isDirty ? "Unsaved changes" : "All changes saved"}
                            </div>
                        )}
                        {showRefreshButton && (
                            <Button type="button" variant="outline" onClick={() => onRefresh?.()}>
                                Refresh
                            </Button>
                        )}
                        {showSubmitButton && <Button type="submit">Save</Button>}
                        {showRefreshButton && lastRefreshedAt && (
                            <span className="text-xs text-muted-foreground">
                                Last refreshed: {lastRefreshedAt.toLocaleString()}
                            </span>
                        )}
                        {showPrintButton && (
                            <Button type="button" variant="secondary" onClick={() => (onPrint ? onPrint() : window.print())}>
                                Print
                            </Button>
                        )}
                        {editHref && (
                            <Button asChild type="button" variant="outline">
                                <Link href={editHref}>Edit</Link>
                            </Button>
                        )}
                        {resolvedViewLinks.map((viewLink) => (
                            <Button asChild type="button" variant="outline" key={`${viewLink.href}-${viewLink.label}`}>
                                <Link href={viewLink.href}>{viewLink.label}</Link>
                            </Button>
                        ))}
                        <Label htmlFor="jump-to-section" className="sr-only">
                            Jump to section
                        </Label>
                        <Select
                            value={jumpSection}
                            onValueChange={(value) => {
                                setJumpSection(value);
                                document.getElementById(value)?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                        >
                            <SelectTrigger id="jump-to-section" aria-label="Jump to section" className="w-[220px]">
                                <SelectValue placeholder="Jump to section" />
                            </SelectTrigger>
                            <SelectContent>
                                {visibleSections.map((sec) => (
                                    <SelectItem key={sec.id} value={sec.id}>
                                        {sec.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCollapsedSections(Object.fromEntries(visibleSections.map((s) => [s.idx, true])))}
                        >
                            Collapse All
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setCollapsedSections({})}>
                            Expand All
                        </Button>
                    </div>
                )}

                {sorted.map((sec, idx) => (
                    <div key={`${sec.section ?? "section"}-${idx}`}>{renderSection(sec, idx)}</div>
                ))}

                <div className="flex gap-2 pt-2 print:hidden">
                    {showDirtyState && (
                        <div className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                            {isDirty ? "Unsaved changes" : "All changes saved"}
                        </div>
                    )}
                    {showSubmitButton && <Button type="submit">Save</Button>}
                    {showRefreshButton && (
                        <Button type="button" variant="outline" onClick={() => onRefresh?.()}>
                            Refresh
                        </Button>
                    )}
                    {showPrintButton && !enableSectionControls && (
                        <Button type="button" variant="secondary" onClick={() => (onPrint ? onPrint() : window.print())} className="no-print">
                            Print
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
