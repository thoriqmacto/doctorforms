'use client';

import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Field = {
    id: string;
    attributes: {
        label: string;
        type: 'text' | 'number' | 'select' | 'textarea' | 'title' | 'image';
        options: string[] | null;
    };
};

type Props = {
    groupedSections: { section: string | null; items: Field[] }[];
    onSubmit: (values: Record<string, any>) => void;
};

export default function TemplateFormRenderer({ groupedSections, onSubmit }: Props) {
    // Build a flexible schema (basic), you can enhance per field
    const baseShape: Record<string, z.ZodTypeAny> = {};
    groupedSections.forEach(sec => {
        sec.items.forEach(f => {
            const name = `f_${f.id}`;
            if (f.attributes.type === 'number') baseShape[name] = z.coerce.number().optional();
            else baseShape[name] = z.string().optional();
        });
    });
    const schema = z.object(baseShape);

    const { control, handleSubmit } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {},
    });

    return (
        <form onSubmit={handleSubmit((vals) => onSubmit(vals))} className="space-y-8">
            {groupedSections.map((sec, idx) => (
                <section key={idx} className="space-y-4">
                    {sec.section ? <h2 className="text-xl font-semibold">{sec.section}</h2> : null}
                    {sec.items.map((f) => {
                        const name = `f_${f.id}`;
                        const t = f.attributes.type;

                        if (t === 'title') {
                            return <h3 key={name} className="text-lg font-medium">{f.attributes.label}</h3>;
                        }

                        if (t === 'image') {
                            return (
                                <div key={name} className="space-y-1">
                                    <Label>{f.attributes.label}</Label>
                                    <div className="text-sm text-muted-foreground">Image upload not implemented yet.</div>
                                </div>
                            );
                        }

                        if (t === 'select') {
                            return (
                                <div key={name} className="space-y-1">
                                    <Label>{f.attributes.label}</Label>
                                    <Controller
                                        control={control}
                                        name={name}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent>
                                                    {(f.attributes.options ?? []).map(opt => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            );
                        }

                        if (t === 'textarea') {
                            return (
                                <div key={name} className="space-y-1">
                                    <Label>{f.attributes.label}</Label>
                                    <Controller
                                        control={control}
                                        name={name}
                                        render={({ field }) => <Textarea {...(field as any)} />}
                                    />
                                </div>
                            );
                        }

                        // text | number
                        return (
                            <div key={name} className="space-y-1">
                                <Label>{f.attributes.label}</Label>
                                <Controller
                                    control={control}
                                    name={name}
                                    render={({ field }) => <Input type={t === 'number' ? 'number' : 'text'} {...(field as any)} />}
                                />
                            </div>
                        );
                    })}
                </section>
            ))}

            <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="secondary" onClick={() => window.print()} className="no-print">
                    Print
                </Button>
            </div>
        </form>
    );
}
