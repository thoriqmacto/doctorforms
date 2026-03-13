"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  createTemplateField,
  deleteTemplateField,
  getHospitals,
  getUser,
  getTemplate,
  getTests,
  updateTemplate,
  updateTemplateField,
  uploadTemplateFieldImage,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Breadcrumbs from "@/components/Breadcrumbs";

type TemplateFieldForm = {
  field_id?: string;
  section: string;
  label: string;
  type: string;
  default_value: string;
  required: boolean;
  static: boolean;
  order: number;
  field_group_order: number;
  option_values: string[];
  title_tag: string;
  image_url: string;
  measurement_name: string;
  measurement_unit: string;
  measurement_category: string;
};

const PATIENT_ATTRIBUTE_OPTIONS = [
  "patients.name",
  "patients.age",
  "patients.dob",
  "patients.dos",
  "patients.gender",
  "patients.mrn",
  "patients.height_cm",
  "patients.weight_kg",
  "patients.bsa",
  "patients.blood_pressure",
  "patients.referring_physician",
  "patients.diagnosis_brief",
];

const USER_ATTRIBUTE_OPTIONS = [
  "users.name",
  "users.email",
  "users.phone",
  "users.position_title",
];

type EditTemplateFormValues = {
  name: string;
  description: string;
  user_id: string;
  test_id: string;
  hospital_id: string;
  fields: TemplateFieldForm[];
};

function findFirstErrorPath(errors: any, parent = ""): string | null {
  if (!errors || typeof errors !== "object") return null;

  for (const key of Object.keys(errors)) {
    const value = errors[key];
    const path = parent ? `${parent}.${key}` : key;

    if (value?.message) return path;

    const nested = findFirstErrorPath(value, path);
    if (nested) return nested;
  }

  return null;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildUniqueName(section: string, label: string) {
  const sectionSlug = toSlug(section || "general") || "general";
  const labelSlug = toSlug(label || "field") || "field";
  return `${sectionSlug}.${labelSlug}`;
}

function normalizeOptions(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return normalizeOptions(JSON.parse(raw));
    } catch {
      return {
        values: [],
        default: "",
        required: false,
        static: false,
        title_tag: "h2",
        image_url: "",
        measurement_name: "",
        measurement_unit: "",
        measurement_category: "",
        textarea_mode: "free",
      };
    }
  }

  if (Array.isArray(raw)) {
    return {
      values: raw.map((v) => String(v)),
      default: "",
      required: false,
      static: false,
      title_tag: "h2",
      image_url: "",
      measurement_name: "",
      measurement_unit: "",
      measurement_category: "",
      textarea_mode: "free",
    };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const values = Array.isArray(obj.values)
      ? obj.values.map((v) => String(v))
      : Array.isArray(obj.options)
        ? obj.options.map((v) => String(v))
        : [];

    return {
      values,
      default: obj.default ? String(obj.default) : "",
      required: !!obj.required,
      static: !!obj.static,
      title_tag: obj.title_tag ? String(obj.title_tag) : "h2",
      image_url: obj.image_url ? String(obj.image_url) : "",
      measurement_name: obj.measurement_name
        ? String(obj.measurement_name)
        : "",
      measurement_unit: obj.measurement_unit
        ? String(obj.measurement_unit)
        : "",
      measurement_category: obj.measurement_category
        ? String(obj.measurement_category)
        : "",
      textarea_mode:
        obj.textarea_mode === "result" ? "result" : "free",
    };
  }

  return {
    values: [],
    default: "",
    required: false,
    static: false,
    title_tag: "h2",
    image_url: "",
    measurement_name: "",
    measurement_unit: "",
    measurement_category: "",
    textarea_mode: "free",
  };
}

function resolveApiAssetUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
  if (!assetBase) return url;

  const normalizedBase = assetBase.endsWith("/")
    ? assetBase.slice(0, -1)
    : assetBase;
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
}

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const {
    data,
    isLoading: isTemplateLoading,
    mutate: mutateTemplate,
  } = useSWR(id ? ["/templates", id, "edit"] : null, () =>
    getTemplate(id, { include: "user,test,hospital,fields" }),
  );
  const { data: testsData, mutate: mutateTests } = useSWR(["/tests"], () =>
    getTests().then((r: any) => r),
  );
  const { data: hospitalsData, mutate: mutateHospitals } = useSWR(
    ["/hospitals"],
    () => getHospitals().then((r: any) => r),
  );

  const form = useForm<EditTemplateFormValues>({
    defaultValues: {
      name: "",
      description: "",
      user_id: "",
      test_id: "",
      hospital_id: "",
      fields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const watchedFields = useWatch({ control: form.control, name: "fields" });
  const selectedTestId = useWatch({ control: form.control, name: "test_id" });
  const selectedHospitalId = useWatch({
    control: form.control,
    name: "hospital_id",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutatingFields, setIsMutatingFields] = useState(false);
  const [uploadingImageByFieldIndex, setUploadingImageByFieldIndex] = useState<
    Record<number, boolean>
  >({});
  const [collapsedSections, setCollapsedSections] = useState<
    Record<number, boolean>
  >({});
  const [sectionJumpValue, setSectionJumpValue] = useState<string>("");
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(
    null,
  );
  const [draggedSectionOrder, setDraggedSectionOrder] = useState<number | null>(
    null,
  );

  const groupedFields = useMemo(() => {
    const groups: {
      groupOrder: number;
      section: string;
      items: Array<{ index: number; renderKey: string }>;
    }[] = [];

    const currentFields = watchedFields ?? [];

    currentFields.forEach((field, index) => {
      const section = field?.section || "General";
      const groupOrder = field?.field_group_order ?? 0;
      let group = groups.find((g) => g.groupOrder === groupOrder);
      if (!group) {
        group = { groupOrder, section, items: [] };
        groups.push(group);
      }
      group.items.push({
        index,
        renderKey:
          fields[index]?.id ?? field?.field_id ?? `${groupOrder}-${index}`,
      });
    });

    groups.forEach((group) => {
      group.items.sort((a, b) => {
        const leftOrder = currentFields[a.index]?.order ?? 0;
        const rightOrder = currentFields[b.index]?.order ?? 0;
        return leftOrder - rightOrder;
      });
    });

    return groups.sort((a, b) => a.groupOrder - b.groupOrder);
  }, [fields, watchedFields]);

  function scrollToField(path: string) {
    const byName = document.querySelector(`[name="${path}"]`);
    const byDataAttr = document.querySelector(`[data-field-path="${path}"]`);
    const target = byName ?? byDataAttr;

    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus();
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSectionName(groupIndices: number[], sectionName: string) {
    groupIndices.forEach((fieldIndex) => {
      form.setValue(`fields.${fieldIndex}.section`, sectionName, {
        shouldDirty: true,
        shouldTouch: true,
      });
    });
  }

  function reorderSectionGroups(sourceGroupOrder: number, targetPosition: number) {
    const orderedGroups = [...groupedFields].sort(
      (a, b) => a.groupOrder - b.groupOrder,
    );
    const sourceIndex = orderedGroups.findIndex(
      (group) => group.groupOrder === sourceGroupOrder,
    );

    if (sourceIndex < 0) return;

    const boundedTarget = Math.min(
      Math.max(targetPosition, 1),
      orderedGroups.length,
    );
    const [movedGroup] = orderedGroups.splice(sourceIndex, 1);
    orderedGroups.splice(boundedTarget - 1, 0, movedGroup);

    orderedGroups.forEach((group, idx) => {
      group.items.forEach((item) => {
        form.setValue(`fields.${item.index}.field_group_order`, idx + 1, {
          shouldDirty: true,
          shouldTouch: true,
        });
      });
    });
  }

  function reorderFieldsInGroup(
    groupOrder: number,
    sourceFieldIndex: number,
    targetPosition: number,
  ) {
    const group = groupedFields.find((item) => item.groupOrder === groupOrder);
    if (!group) return;

    const orderedIndexes = [...group.items.map((item) => item.index)];
    const sourceIndex = orderedIndexes.findIndex((idx) => idx === sourceFieldIndex);
    if (sourceIndex < 0) return;

    const boundedTarget = Math.min(
      Math.max(targetPosition, 1),
      orderedIndexes.length,
    );

    const [movedField] = orderedIndexes.splice(sourceIndex, 1);
    orderedIndexes.splice(boundedTarget - 1, 0, movedField);

    orderedIndexes.forEach((fieldIndex, idx) => {
      form.setValue(`fields.${fieldIndex}.order`, idx + 1, {
        shouldDirty: true,
        shouldTouch: true,
      });
    });
  }

  async function removeSection(groupIndices: number[]) {
    const sorted = [...groupIndices].sort((a, b) => b - a);
    const persistedIds = sorted
      .map((fieldIndex) => form.getValues(`fields.${fieldIndex}.field_id`))
      .filter((v): v is string => Boolean(v));

    try {
      setIsMutatingFields(true);
      setSuccessMessage("");
      if (persistedIds.length > 0) {
        await Promise.all(persistedIds.map((fid) => deleteTemplateField(fid)));
      }
      sorted.forEach((fieldIndex) => remove(fieldIndex));
      setSuccessMessage("Section has been successfully removed.");
      await mutateTemplate();
      scrollToTop();
    } catch (e) {
      console.error(e);
      alert("Failed to remove section");
    } finally {
      setIsMutatingFields(false);
    }
  }

  async function removeField(fieldIndex: number) {
    const persistedId = form.getValues(`fields.${fieldIndex}.field_id`);

    try {
      setIsMutatingFields(true);
      setSuccessMessage("");
      if (persistedId) {
        await deleteTemplateField(persistedId);
      }
      remove(fieldIndex);
      setSuccessMessage("Field has been successfully removed.");
      await mutateTemplate();
      scrollToTop();
    } catch (e) {
      console.error(e);
      alert("Failed to remove field");
    } finally {
      setIsMutatingFields(false);
    }
  }

  const hydrateForm = useCallback(
    (templateResponse: any) => {
      if (!templateResponse?.data) return;
      const a = templateResponse.data.attributes;
      const rels = templateResponse.data.relationships;
      const grouped = templateResponse?.data?.meta?.grouped_sections ?? [];
      const existing = grouped
        .flatMap((g: any) =>
          (g.items ?? []).map((f: any) => {
            const options = normalizeOptions(f.attributes?.options);
            return {
              field_id: String(f.id),
              section: f.attributes?.section ?? g.section ?? "General",
              label: f.attributes?.label ?? "",
              type:
                f.attributes?.type === "checkbox_group"
                  ? "checkbox"
                  : f.attributes?.type === "textarea" &&
                      options.textarea_mode === "result"
                    ? "textarea_result"
                    : f.attributes?.type === "textarea"
                      ? "textarea_free"
                  : (f.attributes?.type ?? "text"),
              default_value:
                f.attributes?.type === "image"
                  ? resolveApiAssetUrl(options.default)
                  : options.default,
              required: options.required,
              static: options.static,
              order: f.attributes?.order ?? 0,
              field_group_order: f.attributes?.field_group_order ?? 0,
              option_values: options.values,
              title_tag: options.title_tag,
              image_url: resolveApiAssetUrl(
                options.image_url || options.default,
              ),
              measurement_name: options.measurement_name,
              measurement_unit: options.measurement_unit,
              measurement_category: options.measurement_category,
            };
          }),
        )
        .sort((a: any, b: any) =>
          a.field_group_order === b.field_group_order
            ? a.order - b.order
            : a.field_group_order - b.field_group_order,
        );

      form.reset({
        name: a.name,
        description: a.description ?? "",
        user_id: rels?.user?.data?.id ? String(rels.user.data.id) : "",
        test_id: rels?.test?.data?.id ? String(rels.test.data.id) : "",
        hospital_id: rels?.hospital?.data?.id
          ? String(rels.hospital.data.id)
          : "",
        fields: existing,
      });
    },
    [form],
  );

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next: Record<number, boolean> = {};
      groupedFields.forEach((group) => {
        next[group.groupOrder] = prev[group.groupOrder] ?? false;
      });
      return next;
    });
  }, [groupedFields]);

  useEffect(() => {
    const currentFields = form.getValues("fields") ?? [];
    currentFields.forEach((field, index) => {
      if (field?.static && !field?.required) {
        form.setValue(`fields.${index}.required`, true, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    });
  }, [form, watchedFields]);

  function scrollToSection(groupOrder: number) {
    const sectionElement = document.querySelector(
      `[data-section-group-order="${groupOrder}"]`,
    );
    if (sectionElement instanceof HTMLElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toggleSection(groupOrder: number, shouldCollapse?: boolean) {
    setCollapsedSections((prev) => {
      const nextValue =
        typeof shouldCollapse === "boolean"
          ? shouldCollapse
          : !prev[groupOrder];
      return { ...prev, [groupOrder]: nextValue };
    });
  }

  function setAllSectionsCollapsed(shouldCollapse: boolean) {
    setCollapsedSections(
      groupedFields.reduce<Record<number, boolean>>((acc, group) => {
        acc[group.groupOrder] = shouldCollapse;
        return acc;
      }, {}),
    );
  }

  useEffect(() => {
    hydrateForm(data);
  }, [data, hydrateForm]);

  async function onSubmit(values: EditTemplateFormValues) {
    try {
      setIsSaving(true);
      setSuccessMessage("");
      scrollToTop();

      await updateTemplate(id, {
        name: values.name,
        description: values.description,
        user_id: Number(values.user_id),
        test_id: Number(values.test_id),
        hospital_id: Number(values.hospital_id),
      });

      if (values.fields?.length) {
        await Promise.all(
          values.fields.map((f, idx) => {
            const baseOptions: Record<string, any> = {
              required: !!f.required,
              static: !!f.static,
            };

            if (f.type === "select" || f.type === "checkbox") {
              baseOptions.values = (f.option_values ?? []).filter(
                (v) => v.trim() !== "",
              );
              if (f.default_value) {
                baseOptions.default = f.default_value;
              }
            } else if (f.type === "patient") {
              if (f.default_value) {
                baseOptions.default = f.default_value;
              }
            } else if (f.type === "user") {
              baseOptions.values = USER_ATTRIBUTE_OPTIONS;
              if (f.default_value) {
                baseOptions.default = f.default_value;
              }
            } else if (f.type === "measurement") {
              baseOptions.default = f.default_value;
              baseOptions.measurement_name = f.measurement_name;
              baseOptions.measurement_unit = f.measurement_unit;
              baseOptions.measurement_category = f.measurement_category;
            } else if (
              f.type === "textarea_free" ||
              f.type === "textarea_result"
            ) {
              baseOptions.textarea_mode =
                f.type === "textarea_result" ? "result" : "free";
              if (f.default_value) {
                baseOptions.default = f.default_value;
              }
            } else if (f.type === "title") {
              baseOptions.title_tag = f.title_tag || "h2";
              if (f.default_value) {
                baseOptions.default = f.default_value;
              }
            } else if (f.type === "image") {
              const imageUrl = f.default_value || f.image_url;
              if (imageUrl) {
                baseOptions.default = imageUrl;
                baseOptions.image_url = imageUrl;
              }
            } else if (f.default_value) {
              baseOptions.default = f.default_value;
            }

            const fieldPayload = {
              template_id: Number(id),
              section: f.section || "General",
              label: f.label,
              type:
                f.type === "checkbox"
                  ? "checkbox_group"
                  : f.type === "textarea_free" || f.type === "textarea_result"
                    ? "textarea"
                    : f.type,
              order: f.order ?? idx + 1,
              field_group_order: f.field_group_order ?? 0,
              options: baseOptions,
            };

            if (f.field_id) {
              return updateTemplateField(f.field_id, fieldPayload);
            }

            return createTemplateField(fieldPayload);
          }),
        );
      }

      setSuccessMessage("Template has been successfully updated.");
      await mutateTemplate();
      scrollToTop();
    } catch (e: any) {
      const errors = e?.response
        ? await e.response.json().catch(() => null)
        : null;
      const firstErrorPath = Object.keys(errors?.errors ?? {})[0];
      if (firstErrorPath) {
        form.setError(firstErrorPath as any, {
          type: "server",
          message: errors.errors[firstErrorPath]?.[0] ?? "Invalid value",
        });
        scrollToField(firstErrorPath);
      }

      console.error(e);
      alert("Failed to save");
      scrollToTop();
    } finally {
      setIsSaving(false);
    }
  }

  function onInvalid() {
    const errorName = findFirstErrorPath(form.formState.errors);
    if (!errorName) return;

    scrollToField(errorName);
  }

  async function onRefresh() {
    try {
      setIsRefreshing(true);
      setSuccessMessage("");
      const refreshedTemplate = await mutateTemplate();
      await Promise.all([mutateTests(), mutateHospitals()]);
      hydrateForm(refreshedTemplate);
      setSuccessMessage("Template data has been refreshed.");
    } catch (e) {
      console.error(e);
      alert("Failed to refresh template data");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function onPickImage(fieldIndex: number, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      alert("Only PNG files are allowed.");
      return;
    }

    try {
      setUploadingImageByFieldIndex((prev) => ({
        ...prev,
        [fieldIndex]: true,
      }));
      const response = await uploadTemplateFieldImage(file);
      const imageUrl = resolveApiAssetUrl(
        response?.data?.attributes?.url ?? "",
      );
      if (!imageUrl) throw new Error("Image upload response missing URL");

      form.setValue(`fields.${fieldIndex}.image_url`, imageUrl, {
        shouldDirty: true,
        shouldTouch: true,
      });
      form.setValue(`fields.${fieldIndex}.default_value`, imageUrl, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setSuccessMessage("Image uploaded successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to upload image");
    } finally {
      setUploadingImageByFieldIndex((prev) => ({
        ...prev,
        [fieldIndex]: false,
      }));
    }
  }

  const templateName = data?.data?.attributes?.name ?? "Template";
  const included = useMemo(() => data?.included ?? [], [data?.included]);

  const tests = useMemo(() => {
    const mappedTests = testsData?.data ?? [];
    if (
      !selectedTestId ||
      mappedTests.some((t: any) => String(t.id) === selectedTestId)
    )
      return mappedTests;

    const includedTest = included.find(
      (item: any) =>
        item.type === "tests" && String(item.id) === selectedTestId,
    );

    return [
      ...mappedTests,
      {
        id: selectedTestId,
        attributes: {
          name: includedTest?.attributes?.name ?? `Test #${selectedTestId}`,
        },
      },
    ];
  }, [included, selectedTestId, testsData?.data]);

  const hospitals = useMemo(() => {
    const mappedHospitals = hospitalsData?.data ?? [];

    if (
      !selectedHospitalId ||
      mappedHospitals.some((h: any) => String(h.id) === selectedHospitalId)
    ) {
      return mappedHospitals;
    }

    const includedHospital = included.find(
      (item: any) =>
        item.type === "hospitals" && String(item.id) === selectedHospitalId,
    );

    return [
      ...mappedHospitals,
      {
        id: selectedHospitalId,
        attributes: {
          name:
            includedHospital?.attributes?.name ??
            `Hospital #${selectedHospitalId}`,
        },
      },
    ];
  }, [hospitalsData?.data, included, selectedHospitalId]);

  const userId = data?.data?.relationships?.user?.data?.id;
  const { data: userData } = useSWR(userId ? ["/users", userId] : null, () =>
    getUser(userId as string).then((r: any) => r),
  );
  const userName = userData?.data?.attributes?.name ?? "";

  const isProcessing =
    isTemplateLoading ||
    isSaving ||
    isRefreshing ||
    isMutatingFields;
  const showLoadingDataMessage = isTemplateLoading || isRefreshing;

  const hasCollapsedSections = groupedFields.some(
    (group) => collapsedSections[group.groupOrder],
  );
  const hasExpandedSections = groupedFields.some(
    (group) => !collapsedSections[group.groupOrder],
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Templates", href: "/templates" },
          { label: `Edit ${templateName}` },
        ]}
      />
      <Card className="mx-auto w-full max-w-5xl">
        <CardHeader className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Edit {templateName}</CardTitle>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {groupedFields.length > 0 ? (
                <Select
                  value={sectionJumpValue}
                  onValueChange={(value) => {
                    setSectionJumpValue(value);
                    scrollToSection(Number(value));
                  }}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Jump to section" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedFields.map((group) => (
                      <SelectItem
                        key={`jump-${group.groupOrder}`}
                        value={String(group.groupOrder)}
                      >
                        {group.section || `Section ${group.groupOrder}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAllSectionsCollapsed(true)}
                disabled={isProcessing || !hasExpandedSections}
              >
                Collapse All
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAllSectionsCollapsed(false)}
                disabled={isProcessing || !hasCollapsedSections}
              >
                Expand All
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onRefresh}
                disabled={isProcessing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit, onInvalid)}
                disabled={isProcessing}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Link href={`/templates/${id}/view`}>
                <Button type="button" variant="ghost" disabled={isProcessing}>
                  View
                </Button>
              </Link>
              <Link href={`/templates/${id}/print`}>
                <Button type="button" variant="ghost" disabled={isProcessing}>
                  Print
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="space-y-4"
            >
              {successMessage ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {successMessage}
                </p>
              ) : null}
              {showLoadingDataMessage ? (
                <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  Loading template data...
                </p>
              ) : null}
              {isSaving ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Saving changes...
                </p>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "Name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <FormControl>
                          <Input value={userName} disabled />
                        </FormControl>
                        <FormMessage />
                        <input type="hidden" {...field} />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="test_id"
                      rules={{ required: "Test is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select test" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tests.map((t: any) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {t.attributes?.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hospital_id"
                      rules={{ required: "Hospital is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hospital</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hospital" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {hospitals.map((h: any) => (
                                <SelectItem key={h.id} value={String(h.id)}>
                                  {h.attributes?.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {groupedFields.map((group) => (
                  <Card
                    key={group.groupOrder}
                    data-section-group-order={group.groupOrder}
                  >
                    <CardHeader>
                      <div
                        className="flex items-end justify-between gap-3"
                        draggable={collapsedSections[group.groupOrder]}
                        onDragStart={() => {
                          if (!collapsedSections[group.groupOrder]) return;
                          setDraggedSectionOrder(group.groupOrder);
                        }}
                        onDragOver={(event) => {
                          if (!collapsedSections[group.groupOrder]) return;
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          if (!collapsedSections[group.groupOrder]) return;
                          event.preventDefault();
                          if (
                            draggedSectionOrder === null ||
                            draggedSectionOrder === group.groupOrder
                          ) {
                            setDraggedSectionOrder(null);
                            return;
                          }

                          const targetPosition =
                            groupedFields.findIndex(
                              (item) => item.groupOrder === group.groupOrder,
                            ) + 1;
                          reorderSectionGroups(draggedSectionOrder, targetPosition);
                          setDraggedSectionOrder(null);
                        }}
                        onDragEnd={() => setDraggedSectionOrder(null)}
                      >
                        <div className="max-w-sm space-y-2">
                          {collapsedSections[group.groupOrder] ? (
                            <p className="text-sm font-medium">
                              {group.section || "Untitled section"}
                            </p>
                          ) : (
                            <>
                              <FormLabel>Section Name</FormLabel>
                              <Input
                                value={group.section}
                                onChange={(e) =>
                                  updateSectionName(
                                    group.items.map((item) => item.index),
                                    e.target.value,
                                  )
                                }
                                data-field-path={`fields.${group.items[0]?.index}.section`}
                              />
                            </>
                          )}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="w-20 space-y-1">
                            <FormLabel>Order</FormLabel>
                            <Input
                              type="number"
                              min={1}
                              value={
                                groupedFields.findIndex(
                                  (item) => item.groupOrder === group.groupOrder,
                                ) + 1
                              }
                              onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                if (!Number.isFinite(nextValue)) return;
                                reorderSectionGroups(group.groupOrder, nextValue);
                              }}
                              disabled={isProcessing}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => toggleSection(group.groupOrder)}
                          >
                            {collapsedSections[group.groupOrder]
                              ? "Expand"
                              : "Collapse"}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() =>
                              removeSection(
                                group.items.map((item) => item.index),
                              )
                            }
                            disabled={isProcessing}
                          >
                            Remove Section
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {!collapsedSections[group.groupOrder] ? (
                      <CardContent className="space-y-3">
                        {group.items.map(({ renderKey, index }) => {
                          const fieldType = form.watch(`fields.${index}.type`);
                          const userDefinedOptions =
                            form.watch(`fields.${index}.option_values`) ?? [];
                          const defaultValueOptions =
                            fieldType === "patient"
                              ? PATIENT_ATTRIBUTE_OPTIONS
                              : fieldType === "user"
                                ? USER_ATTRIBUTE_OPTIONS
                                : userDefinedOptions;
                          const currentDefaultValue = form.watch(
                            `fields.${index}.default_value`,
                          );
                          const isStaticField = form.watch(
                            `fields.${index}.static`,
                          );
                          const usesDefaultValueSelect =
                            fieldType === "select" ||
                            fieldType === "checkbox" ||
                            fieldType === "patient" ||
                            fieldType === "user";
                          const supportsCustomOptions =
                            fieldType === "select" || fieldType === "checkbox";

                          return (
                            <div
                              key={renderKey}
                              className="grid grid-cols-1 items-end gap-3 md:grid-cols-12"
                              draggable
                              onDragStart={() => setDraggedFieldIndex(index)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (
                                  draggedFieldIndex === null ||
                                  draggedFieldIndex === index
                                ) {
                                  setDraggedFieldIndex(null);
                                  return;
                                }

                                const targetPosition =
                                  group.items.findIndex(
                                    (item) => item.index === index,
                                  ) + 1;
                                reorderFieldsInGroup(
                                  group.groupOrder,
                                  draggedFieldIndex,
                                  targetPosition,
                                );
                                setDraggedFieldIndex(null);
                              }}
                              onDragEnd={() => setDraggedFieldIndex(null)}
                            >
                              <input
                                type="hidden"
                                {...form.register(`fields.${index}.field_id`)}
                              />
                              <input
                                type="hidden"
                                {...form.register(`fields.${index}.section`)}
                              />
                              <input
                                type="hidden"
                                {...form.register(`fields.${index}.image_url`)}
                              />

                              <FormField
                                control={form.control}
                                name={`fields.${index}.order`}
                                render={({ field }) => (
                                  <FormItem
                                    className="md:col-span-1"
                                    data-field-path={`fields.${index}.order`}
                                  >
                                    <FormLabel>Order</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={field.value ?? 1}
                                        onChange={(event) => {
                                          const nextValue = Number(event.target.value);
                                          if (!Number.isFinite(nextValue)) return;
                                          reorderFieldsInGroup(
                                            group.groupOrder,
                                            index,
                                            nextValue,
                                          );
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`fields.${index}.label`}
                                rules={{ required: "Field label is required" }}
                                render={({ field }) => (
                                  <FormItem
                                    className="md:col-span-3 md:min-w-[180px]"
                                    data-field-path={`fields.${index}.label`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <FormLabel>Field Label</FormLabel>
                                      <span className="text-xs text-muted-foreground">
                                        {buildUniqueName(
                                          group.section,
                                          field.value,
                                        )}
                                      </span>
                                    </div>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`fields.${index}.type`}
                                render={({ field }) => (
                                  <FormItem
                                    className="md:col-span-2"
                                    data-field-path={`fields.${index}.type`}
                                  >
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        if (
                                          value !== "select" &&
                                          value !== "checkbox"
                                        ) {
                                          form.setValue(
                                            `fields.${index}.option_values`,
                                            [],
                                            {
                                              shouldDirty: true,
                                              shouldTouch: true,
                                            },
                                          );
                                        }
                                      }}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="text">
                                          Text
                                        </SelectItem>
                                        <SelectItem value="number">
                                          Number
                                        </SelectItem>
                                        <SelectItem value="select">
                                          Select
                                        </SelectItem>
                                        <SelectItem value="checkbox">
                                          Checkbox
                                        </SelectItem>
                                        <SelectItem value="textarea_free">
                                          Textarea-free
                                        </SelectItem>
                                        <SelectItem value="textarea_result">
                                          Textarea-result
                                        </SelectItem>
                                        <SelectItem value="title">
                                          Title
                                        </SelectItem>
                                        <SelectItem value="image">
                                          Image
                                        </SelectItem>
                                        <SelectItem value="date">
                                          Date
                                        </SelectItem>
                                        <SelectItem value="patient">
                                          Patient
                                        </SelectItem>
                                        <SelectItem value="user">
                                          User
                                        </SelectItem>
                                        <SelectItem value="measurement">
                                          Measurement
                                        </SelectItem>
                                        <SelectItem value="bullseye">
                                          Bullseye
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              {usesDefaultValueSelect ? (
                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.default_value`}
                                  rules={{
                                    validate: (value) => {
                                      if (fieldType === "checkbox") return true;
                                      if (!isStaticField) return true;
                                      return value?.toString().trim()
                                        ? true
                                        : "Default value is required for static fields";
                                    },
                                  }}
                                  render={({ field }) => (
                                    <FormItem
                                      className="md:col-span-4 md:min-w-[180px]"
                                      data-field-path={`fields.${index}.default_value`}
                                    >
                                      <FormLabel>Default Value</FormLabel>
                                      <Select
                                        onValueChange={(value) =>
                                          field.onChange(
                                            value === "__none__" ? "" : value,
                                          )
                                        }
                                        value={field.value || ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select default option" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {fieldType === "checkbox" ? (
                                            <SelectItem value="__none__">
                                              No default option
                                            </SelectItem>
                                          ) : null}
                                          {defaultValueOptions
                                            .filter((option) => option.trim())
                                            .map((option, optionIndex) => (
                                              <SelectItem
                                                key={`${option}-${optionIndex}`}
                                                value={option}
                                              >
                                                {option}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              ) : (
                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.default_value`}
                                  rules={{
                                    validate: (value) => {
                                      if (fieldType === "measurement") {
                                        return value?.toString().trim()
                                          ? true
                                          : "Default value is required for measurement fields";
                                      }
                                      if (!isStaticField) return true;
                                      return value?.toString().trim()
                                        ? true
                                        : "Default value is required for static fields";
                                    },
                                  }}
                                  render={({ field }) => (
                                    <FormItem
                                      className="md:col-span-4 md:min-w-[180px]"
                                      data-field-path={`fields.${index}.default_value`}
                                    >
                                      <FormLabel>Default Value</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type={
                                            fieldType === "date"
                                              ? "date"
                                              : "text"
                                          }
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-4 md:justify-end">
                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.static`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={(checked) => {
                                            const nextValue = checked === true;
                                            field.onChange(nextValue);
                                            if (nextValue) {
                                              form.setValue(
                                                `fields.${index}.required`,
                                                true,
                                                {
                                                  shouldDirty: true,
                                                  shouldTouch: true,
                                                },
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel>Static</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.required`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          disabled={isStaticField}
                                        />
                                      </FormControl>
                                      <FormLabel>Required</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => removeField(index)}
                                  disabled={isProcessing}
                                >
                                  Remove
                                </Button>
                              </div>

                              {supportsCustomOptions ? (
                                <div className="space-y-2 md:col-span-10">
                                  <FormLabel>
                                    {fieldType === "checkbox"
                                      ? "Checkbox Options"
                                      : "Select Options"}
                                  </FormLabel>
                                  {userDefinedOptions.map((_, optionIndex) => (
                                    <div
                                      className="flex items-center gap-2"
                                      key={`field-${index}-option-${optionIndex}`}
                                    >
                                      <Input
                                        value={userDefinedOptions[optionIndex] ?? ""}
                                        onChange={(e) => {
                                          const updated = [...userDefinedOptions];
                                          updated[optionIndex] = e.target.value;
                                          form.setValue(
                                            `fields.${index}.option_values`,
                                            updated,
                                            {
                                              shouldDirty: true,
                                              shouldTouch: true,
                                            },
                                          );
                                          if (
                                            currentDefaultValue &&
                                            !updated.includes(
                                              currentDefaultValue,
                                            )
                                          ) {
                                            form.setValue(
                                              `fields.${index}.default_value`,
                                              "",
                                              {
                                                shouldDirty: true,
                                                shouldTouch: true,
                                              },
                                            );
                                          }
                                        }}
                                        placeholder={`Option ${optionIndex + 1}`}
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                          const updated = userDefinedOptions.filter(
                                            (__, i) => i !== optionIndex,
                                          );
                                          form.setValue(
                                            `fields.${index}.option_values`,
                                            updated,
                                            {
                                              shouldDirty: true,
                                              shouldTouch: true,
                                            },
                                          );
                                          if (
                                            currentDefaultValue &&
                                            !updated.includes(
                                              currentDefaultValue,
                                            )
                                          ) {
                                            form.setValue(
                                              `fields.${index}.default_value`,
                                              "",
                                              {
                                                shouldDirty: true,
                                                shouldTouch: true,
                                              },
                                            );
                                          }
                                        }}
                                      >
                                        Remove Option
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                      form.setValue(
                                        `fields.${index}.option_values`,
                                        [...userDefinedOptions, ""],
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                        },
                                      )
                                    }
                                  >
                                    Add Option
                                  </Button>
                                </div>
                              ) : null}

                              {fieldType === "measurement" ? (
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`fields.${index}.measurement_name`}
                                    rules={{
                                      required:
                                        "Measurement name is required for measurement fields",
                                    }}
                                    render={({ field }) => (
                                      <FormItem
                                        className="md:col-span-3"
                                        data-field-path={`fields.${index}.measurement_name`}
                                      >
                                        <FormLabel>Measurement Name</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`fields.${index}.measurement_unit`}
                                    rules={{
                                      required:
                                        "Measurement unit is required for measurement fields",
                                    }}
                                    render={({ field }) => (
                                      <FormItem
                                        className="md:col-span-2"
                                        data-field-path={`fields.${index}.measurement_unit`}
                                      >
                                        <FormLabel>Measurement Unit</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`fields.${index}.measurement_category`}
                                    rules={{
                                      required:
                                        "Measurement category is required for measurement fields",
                                    }}
                                    render={({ field }) => (
                                      <FormItem
                                        className="md:col-span-2"
                                        data-field-path={`fields.${index}.measurement_category`}
                                      >
                                        <FormLabel>Measurement Category</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              ) : null}

                              {fieldType === "title" ? (
                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.title_tag`}
                                  render={({ field }) => (
                                    <FormItem
                                      className="md:col-span-4"
                                      data-field-path={`fields.${index}.title_tag`}
                                    >
                                      <FormLabel>Title Tag</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "h2"}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select title tag" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="h1">h1</SelectItem>
                                          <SelectItem value="h2">h2</SelectItem>
                                          <SelectItem value="h3">h3</SelectItem>
                                          <SelectItem value="h4">h4</SelectItem>
                                          <SelectItem value="h6">h6</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              ) : null}

                              {fieldType === "image" ? (
                                <div className="space-y-2 md:col-span-10">
                                  <FormLabel>Upload PNG Image</FormLabel>
                                  <Input
                                    type="file"
                                    accept="image/png"
                                    onChange={(e) =>
                                      onPickImage(index, e.target.files)
                                    }
                                  />
                                  {uploadingImageByFieldIndex[index] ? (
                                    <p className="text-sm text-muted-foreground">
                                      Uploading image...
                                    </p>
                                  ) : null}
                                  {currentDefaultValue ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={currentDefaultValue}
                                      alt="Field default preview"
                                      className="h-48 w-48 rounded-md border object-cover"
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            append({
                              section: group.section || "General",
                              label: "",
                              type: "text",
                              default_value: "",
                              required: false,
                              static: false,
                              order: group.items.length + 1,
                              field_group_order: group.groupOrder,
                              option_values: [],
                              title_tag: "h2",
                              image_url: "",
                              measurement_name: "",
                              measurement_unit: "",
                              measurement_category: "",
                            })
                          }
                          disabled={isProcessing}
                        >
                          Add Field
                        </Button>
                      </CardContent>
                    ) : null}
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    append({
                      section:
                        window
                          .prompt(
                            "Section name",
                            `New Section ${groupedFields.length + 1}`,
                          )
                          ?.trim() || `New Section ${groupedFields.length + 1}`,
                      label: "",
                      type: "text",
                      default_value: "",
                      required: false,
                      static: false,
                      order: fields.length + 1,
                      field_group_order: groupedFields.length + 1,
                      option_values: [],
                      title_tag: "h2",
                      image_url: "",
                      measurement_name: "",
                      measurement_unit: "",
                      measurement_category: "",
                    })
                  }
                  disabled={isProcessing}
                >
                  Add Section
                </Button>
              </div>
              <Button type="submit" disabled={isProcessing}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
