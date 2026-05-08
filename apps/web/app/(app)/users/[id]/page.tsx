'use client';

import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getUser, updateUser, deleteUser, getHospitals, getHospitalSignatories, createHospitalSignatory, updateHospitalSignatory, deleteHospitalSignatory, uploadHospitalSignatorySignature, deleteHospitalSignatorySignature } from '@/lib/api';
import { Button } from '@/components/ui/button'; import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input'; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; import Breadcrumbs from '@/components/Breadcrumbs';

export default function EditUserPage() { const router = useRouter(); const params = useParams(); const id = params?.id as string;
 const { data } = useSWR(id ? ['/users', id] : null, () => getUser(id)); const { data: hospitalsRes } = useSWR('/hospitals', () => getHospitals());
 const hospitals = hospitalsRes?.data ?? []; const name = data?.data?.attributes?.name ?? 'User';
 const form = useForm({ defaultValues: { name: '', email: '', phone: '', role: 'staff', position_title: '', password: '' }, });
 const selectedRole = form.watch('role'); const [hospitalId, setHospitalId] = useState<string>(''); const [signatory, setSignatory] = useState<any>(null); const [signatoryForm, setSignatoryForm] = useState({ name:'', position_title:'', sip_number:'', active:true }); const [msg, setMsg] = useState<string | null>(null); const [file, setFile] = useState<File | null>(null);
 useEffect(() => { if (data?.data) { const a = data.data.attributes; form.reset({ name: a.name, email: a.email, phone: a.phone ?? '', role: a.role ?? 'staff', position_title: a.positionTitle ?? '', password: '' }); } }, [data, form]);
 useEffect(() => { const load = async () => { if (!hospitalId || selectedRole !== 'doctor') return; const res = await getHospitalSignatories(hospitalId); const list = res?.data ?? []; const found = list.find((s:any)=>Number(s.attributes?.user_id)===Number(id)); setSignatory(found ?? null); setSignatoryForm(found ? { name: found.attributes.name ?? '', position_title: found.attributes.position_title ?? '', sip_number: found.attributes.sip_number ?? '', active: !!found.attributes.active } : { name: form.getValues('name'), position_title: form.getValues('position_title'), sip_number: '', active: true }); }; void load(); }, [hospitalId, selectedRole, id]);
 async function onSubmit(values: any) { try { const payload = { ...values }; if (!payload.password) delete payload.password; await updateUser(id, payload); router.push('/users'); } catch (e) { console.error(e); alert('Failed to save'); } }
 async function onDelete() { try { await deleteUser(id); router.push('/users'); } catch (e) { console.error(e); alert('Failed to delete'); } }
 const doctorSection = selectedRole === 'doctor';
 return (<div className="space-y-4"><Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' },{ label: 'Users', href: '/users' },{ label: name }]} />
 <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Edit User</CardTitle><Button variant="destructive" onClick={onDelete} type="button">Delete</Button></CardHeader><CardContent><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">{/* fields omitted for brevity */}
 <FormField control={form.control} name="name" rules={{ required: 'Name is required' }} render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
 <FormField control={form.control} name="email" rules={{ required: 'Email is required' }} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
 <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">admin</SelectItem><SelectItem value="doctor">doctor</SelectItem><SelectItem value="staff">staff</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
 <FormField control={form.control} name="position_title" render={({ field }) => (<FormItem><FormLabel>Position Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
 <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
 <Button type="submit">Save</Button></form></Form></CardContent></Card>
 {doctorSection && <Card><CardHeader><CardTitle>Doctor Signature / Signatory</CardTitle></CardHeader><CardContent className="space-y-3">
 {msg && <div className="text-sm">{msg}</div>}
 <div><FormLabel>Hospital</FormLabel><Select value={hospitalId} onValueChange={setHospitalId}><SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger><SelectContent>{hospitals.map((h:any)=><SelectItem key={h.id} value={String(h.id)}>{h.attributes?.name}</SelectItem>)}</SelectContent></Select></div>
 <div><FormLabel>Name</FormLabel><Input value={signatoryForm.name} onChange={(e)=>setSignatoryForm(v=>({...v,name:e.target.value}))} /></div>
 <div><FormLabel>Position title</FormLabel><Input value={signatoryForm.position_title} onChange={(e)=>setSignatoryForm(v=>({...v,position_title:e.target.value}))} /></div>
 <div><FormLabel>SIP number</FormLabel><Input value={signatoryForm.sip_number} onChange={(e)=>setSignatoryForm(v=>({...v,sip_number:e.target.value}))} /></div>
 <Button type="button" onClick={async ()=>{ if(!hospitalId) return; const payload={ user_id:Number(id), ...signatoryForm }; const res=signatory ? await updateHospitalSignatory(signatory.id,payload) : await createHospitalSignatory(hospitalId,payload); setSignatory(res.data); setMsg('Signatory saved'); }}>Save Signatory</Button>
 {signatory && <Button type="button" variant="destructive" onClick={async ()=>{ await deleteHospitalSignatory(signatory.id); setSignatory(null); setMsg('Signatory deleted'); }}>Delete Signatory</Button>}
 {signatory ? <div className="space-y-2">{signatory.attributes?.signature_image_url && <img src={signatory.attributes.signature_image_url} alt="signature" className="max-h-24" />}<Input type="file" accept="image/png" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} /><Button type="button" onClick={async()=>{ if(!file) return; const res=await uploadHospitalSignatorySignature(signatory.id,file); setSignatory(res.data); setMsg('Signature uploaded'); }}>Upload Signature</Button>{signatory.attributes?.signature_image_url && <Button type="button" variant="outline" onClick={async()=>{ await deleteHospitalSignatorySignature(signatory.id); setSignatory({...signatory, attributes:{...signatory.attributes, signature_image_url:null}}); }}>Delete Signature</Button>}</div> : <p className="text-sm text-muted-foreground">Save signatory first before uploading signature.</p>}
 </CardContent></Card>}
 </div>); }
