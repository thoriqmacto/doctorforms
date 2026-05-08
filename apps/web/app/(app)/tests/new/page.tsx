'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { createTest, type TestPayload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewTestPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [form, setForm] = useState<TestPayload>({ code: '', name: '', type: '', description: '' });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            await createTest(form);
            router.push('/tests');
        } catch {
            setError('Failed to create test.');
        }
    }

    return <div className="space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tests', href: '/tests' }, { label: 'New Test' }]} />
        <Card>
            <CardHeader><CardTitle>New Test</CardTitle></CardHeader>
            <CardContent>
                {error ? <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="code">Code</Label><Input id="code" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="type">Type</Label><Input id="type" value={form.type ?? ''} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <Button type="submit">Save</Button>
                </form>
            </CardContent>
        </Card>
    </div>
}
