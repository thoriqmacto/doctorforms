'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { deleteTest, getTest, updateTest, type TestPayload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EditTestPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [error, setError] = useState('');
    const [form, setForm] = useState<TestPayload>({ code: '', name: '', type: '', description: '' });

    const { data, isLoading } = useSWR(params?.id ? ['/tests', params.id] : null, () => getTest(params.id));

    useEffect(() => {
        const attrs = data?.data?.attributes;
        if (attrs) {
            setForm({
                code: attrs.code ?? '',
                name: attrs.name ?? '',
                type: attrs.type ?? '',
                description: attrs.description ?? '',
            });
        }
    }, [data]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            await updateTest(params.id, form);
            router.push('/tests');
        } catch {
            setError('Failed to update test.');
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this test?')) {
            return;
        }
        setError('');
        try {
            await deleteTest(params.id);
            router.push('/tests');
        } catch {
            setError('Failed to delete test.');
        }
    }

    return <div className="space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tests', href: '/tests' }, { label: `Test #${params.id}` }]} />
        <Card>
            <CardHeader><CardTitle>Edit Test</CardTitle></CardHeader>
            <CardContent>
                {isLoading ? 'Loading…' : <>
                    {error ? <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="code">Code</Label><Input id="code" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                        <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label htmlFor="type">Type</Label><Input id="type" value={form.type ?? ''} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
                        <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                        <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button></div>
                    </form>
                </>}
            </CardContent>
        </Card>
    </div>
}
