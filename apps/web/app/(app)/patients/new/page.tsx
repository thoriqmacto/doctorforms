'use client';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientForm, { type PatientFormValues } from '@/components/patients/PatientForm';
import { createPatient, getHospitals, getUsers } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

export default function NewPatientPage(){
  const router=useRouter(); const { user }=useAuth();
  const {data:hospitalsRes,error:hospitalsError}=useSWR('/hospitals',()=>getHospitals());
  const {data:usersRes,error:usersError}=useSWR('/users',()=>getUsers());
  const hospitals=(hospitalsRes?.data??[]).map((h:any)=>({id:Number(h.id),name:h.attributes?.name??`Hospital ${h.id}`}));
  const users=(usersRes?.data??[]).map((u:any)=>({id:Number(u.id),name:u.attributes?.name??`User ${u.id}`,role:u.attributes?.role}));
  const initial:PatientFormValues={mrn:'',name:'',gender:'male',dob:'',dos:'',age:'',height_cm:'',weight_kg:'',bsa:'',blood_pressure:'',diagnosis_brief:'',referring_physician:'',hospital_id:'',user_id:user?.id?String(user.id):''};
  return <div className="space-y-4"><Breadcrumbs items={[{label:'Dashboard',href:'/dashboard'},{label:'Patients',href:'/patients'},{label:'New Patient'}]}/><Card><CardHeader><CardTitle>New Patient</CardTitle></CardHeader><CardContent>{hospitalsError?<p className='text-sm text-destructive'>Unable to load hospitals for patient setup.</p>:usersError?<p className='text-sm text-destructive'>Unable to load users for patient setup.</p>:<PatientForm initialValues={initial} hospitals={hospitals} users={users} onSubmit={async(payload)=>{try{await createPatient(payload);router.push('/patients');}catch(err:any){const msg=err?.response?await err.response.json().then((r:any)=>Object.values(r?.errors??{}).flat().join(' ')).catch(()=>null):null;throw new Error(msg||'Failed to create patient.');}}} submitLabel='Create Patient'/>}</CardContent></Card></div>
}
