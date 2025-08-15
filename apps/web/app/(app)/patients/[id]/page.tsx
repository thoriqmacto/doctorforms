"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { getHospital, getPatient, getUser, updatePatient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function PatientDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading } = useSWR(
        params?.id ? ["/patients", params.id] : null,
        () => getPatient(params.id).then((r: any) => r)
    );

    const patient = data?.data;
    const attrs = patient?.attributes ?? {};
    const name = attrs.name ?? (attrs as any).values?.patient_name ?? "Patient";

    const [baseForm, setBaseForm] = useState<Record<string, any>>({});
    const [valueForm, setValueForm] = useState<Record<string, any>>({});

    useEffect(() => {
        if (patient) {
            const a = { ...(patient.attributes || {}) } as Record<string, any>;
            const v = a.values ?? {};
            delete a.values;
            setBaseForm(a);
            setValueForm(v);
        }
    }, [patient]);

    const hospitalId = patient?.relationships?.hospital?.data?.id;
    const userId = patient?.relationships?.user?.data?.id;

    const { data: hospitalRes } = useSWR(
        hospitalId ? ["/hospitals", hospitalId] : null,
        () => getHospital(hospitalId as string).then((r: any) => r)
    );
    const { data: userRes } = useSWR(
        userId ? ["/users", userId] : null,
        () => getUser(userId as string).then((r: any) => r)
    );

    const hospital = hospitalRes?.data;
    const user = userRes?.data;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const numberFields = new Set([
            "age",
            "height_cm",
            "weight_kg",
            "bsa",
        ]);
        const payload: Record<string, any> = {};
        Object.entries(baseForm).forEach(([k, v]) => {
            if (["id", "created_at", "updated_at"].includes(k)) return;
            if (numberFields.has(k)) {
                payload[k] = v === "" || v === null ? null : Number(v);
            } else {
                payload[k] = v;
            }
        });
        payload.values = valueForm;
        try {
            await updatePatient(params.id, payload);
            router.push("/patients");
        } catch (err) {
            console.error(err);
            alert("Failed to save");
        }
    }

    return (
        <div className="space-y-4">
            <Breadcrumbs
                items={[
                    { label: "Dashboard", href: "/" },
                    { label: "Patients", href: "/patients" },
                    { label: name },
                ]}
            />
            {isLoading ? (
                "Loading…"
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.keys(baseForm).length > 0 && (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Attribute</TableHead>
                                                <TableHead>Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(baseForm).map(([k, v]) => (
                                                <TableRow key={k}>
                                                    <TableCell>{k}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={v ?? ""}
                                                            disabled={
                                                                k === "id" ||
                                                                k === "created_at" ||
                                                                k === "updated_at"
                                                            }
                                                            onChange={(e) =>
                                                                setBaseForm({
                                                                    ...baseForm,
                                                                    [k]: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                                {Object.keys(valueForm).length > 0 && (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Field</TableHead>
                                                <TableHead>Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(valueForm).map(([k, v]) => (
                                                <TableRow key={k}>
                                                    <TableCell>{k}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={v ?? ""}
                                                            onChange={(e) =>
                                                                setValueForm({
                                                                    ...valueForm,
                                                                    [k]: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                                <div className="pt-2">
                                    <Button type="submit">Save</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>

                    {hospital && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Hospital</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <div>
                                    <span className="font-medium">ID:</span> {hospital.id}
                                </div>
                                <div>
                                    <span className="font-medium">Name:</span>{" "}
                                    {hospital.attributes?.name ?? "-"}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {user && (
                        <Card>
                            <CardHeader>
                                <CardTitle>User</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <div>
                                    <span className="font-medium">ID:</span> {user.id}
                                </div>
                                <div>
                                    <span className="font-medium">Name:</span>{" "}
                                    {user.attributes?.name ?? "-"}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
