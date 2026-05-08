'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ENTITY_BINDING_CATALOG,
    bindingPathsFor,
    resolveTemplateString,
    type AlignToken,
    type Binding,
    type FontSizeToken,
    type FontWeightToken,
    type HeaderConfig,
    type HeaderLine,
    type HeaderLogoSlot,
    type ImageSizeToken,
    type SpacingToken,
} from '@/lib/template-renderer/schema';
import type { HospitalContext, RenderContexts } from '@/lib/template-renderer/schema/types';
import { resolveBinding } from '@/lib/template-renderer/schema/bindings';

type Props = {
    value: HeaderConfig | null;
    onChange: (next: HeaderConfig) => void;
    hospitalAttributes?: Record<string, unknown>;
    embedded?: boolean;
};

const FONT_SIZES: FontSizeToken[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const WEIGHTS: FontWeightToken[] = ['normal', 'bold'];
const ALIGNS: AlignToken[] = ['left', 'center', 'right'];
const SPACINGS: SpacingToken[] = ['none', 'xs', 'sm', 'md', 'lg'];
const IMAGE_SIZES: ImageSizeToken[] = ['sm', 'md', 'lg', 'xl'];

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
    layout: 'three-col',
    logo: {
        left: { binding: { source: 'hospital', path: 'logo_url' }, size: 'lg', visible: true },
        right: { binding: { source: 'hospital', path: 'secondary_logo_url' }, size: 'xl', visible: true },
    },
    lines: [
        { binding: { source: 'hospital', path: 'parent_org_line' }, font: 'md', weight: 'bold', align: 'center', uppercase: true, visible: true },
        { binding: { source: 'hospital', path: 'name' }, font: 'lg', weight: 'bold', align: 'center', uppercase: true, visible: true },
        { template: '{{hospital.address}}, Telp: {{hospital.phone}}, Faks: {{hospital.fax}}, WA/Telegram: {{hospital.whatsapp_phone}}', font: 'xs', weight: 'bold', align: 'center', visible: true },
        { template: 'Email: {{hospital.email}}, Website: {{hospital.website}}', font: 'xs', weight: 'bold', align: 'center', visible: true },
        { binding: { source: 'hospital', path: 'city' }, font: 'md', weight: 'bold', align: 'center', uppercase: true, visible: true },
    ],
    divider: { visible: false, thicknessPt: 0.75 },
};

export default function HeaderConfigEditor({ value, onChange, hospitalAttributes, embedded }: Props) {
    const config: HeaderConfig = value ?? DEFAULT_HEADER_CONFIG;
    const hospitalPaths = useMemo(() => bindingPathsFor('hospital'), []);
    const textLinePaths = useMemo(() => hospitalPaths.filter((p) => !p.includes('logo_url')), [hospitalPaths]);

    function patch(next: Partial<HeaderConfig>) { onChange({ ...config, ...next }); }
    function patchLine(idx: number, next: Partial<HeaderLine>) {
        const lines = config.lines.slice();
        lines[idx] = { ...lines[idx], ...next };
        patch({ lines });
    }
    function patchLogo(slot: 'left' | 'right', next: Partial<HeaderLogoSlot>) {
        patch({ logo: { ...config.logo, [slot]: { ...(config.logo[slot] ?? {}), ...next } } });
    }
    function addLine() { patch({ lines: [...config.lines, { literal: '', font: 'sm', weight: 'normal', align: 'center', visible: true }] }); }
    function removeLine(idx: number) { patch({ lines: config.lines.filter((_, i) => i !== idx) }); }
    function moveLine(idx: number, direction: 'up' | 'down') {
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= config.lines.length) return;
        const lines = config.lines.slice();
        [lines[idx], lines[target]] = [lines[target], lines[idx]];
        patch({ lines });
    }
    function setMode(idx: number, mode: 'binding' | 'template' | 'literal') {
        if (mode === 'binding') patchLine(idx, { binding: { source: 'hospital', path: 'name' } as Binding, template: undefined, literal: undefined });
        if (mode === 'template') patchLine(idx, { template: '', binding: undefined, literal: undefined });
        if (mode === 'literal') patchLine(idx, { literal: '', binding: undefined, template: undefined });
    }
    function resolvePreview(line: HeaderLine): string {
        const contexts: RenderContexts = { hospital: hospitalAttributes as HospitalContext };
        let text = '';
        if (line.template !== undefined) text = resolveTemplateString(line.template, contexts);
        else if (line.binding) text = resolveBinding(line.binding, contexts) ?? '';
        else if (line.literal) text = line.literal;
        if (line.uppercase) text = text.toUpperCase();
        return text.trim();
    }

    const editorContent = <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{(['left','right'] as const).map((slot)=>{const logo=config.logo[slot]; const path=logo?.binding?.source==='hospital'?logo.binding.path:''; return <div key={slot} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between"><Label className="font-medium capitalize">{slot} logo</Label><label className="inline-flex items-center gap-2 text-xs"><Checkbox checked={logo?.visible ?? false} onCheckedChange={(c)=>patchLogo(slot,{visible:c===true})}/>Visible</label></div>
                <div><Label className="text-xs">Hospital attribute</Label><Select value={path} onValueChange={(v)=>patchLogo(slot,{binding:{source:'hospital',path:v}})}><SelectTrigger><SelectValue placeholder="Select attribute"/></SelectTrigger><SelectContent>{hospitalPaths.filter((p)=>p.includes('logo_url')).map((p)=><SelectItem key={p} value={p}>hospital.{p}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Size</Label><Select value={logo?.size ?? 'lg'} onValueChange={(v)=>patchLogo(slot,{size:v as ImageSizeToken})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{IMAGE_SIZES.map((s)=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>})}</div>
            <div className="space-y-2"><Label className="font-medium">Header lines</Label>
            {config.lines.map((line,idx)=>{const mode: 'binding'|'template'|'literal' = line.template!==undefined?'template':line.binding?'binding':'literal'; const path=line.binding?.source==='hospital'?line.binding.path:''; const preview=hospitalAttributes?resolvePreview(line):''; return <div key={idx} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={mode} onValueChange={(v)=>setMode(idx, v as 'binding'|'template'|'literal')}><SelectTrigger className="w-[160px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="binding">Hospital field</SelectItem><SelectItem value="template">Template string</SelectItem><SelectItem value="literal">Literal text</SelectItem></SelectContent></Select>
                    {mode==='binding' && <Select value={path} onValueChange={(v)=>patchLine(idx,{binding:{source:'hospital',path:v} as Binding})}><SelectTrigger className="min-w-[220px] flex-1"><SelectValue placeholder="Select attribute"/></SelectTrigger><SelectContent>{textLinePaths.map((p)=><SelectItem key={p} value={p}>hospital.{p}</SelectItem>)}</SelectContent></Select>}
                    {mode==='template' && <Textarea className="min-w-[280px] flex-1" value={line.template ?? ''} onChange={(e)=>patchLine(idx,{template:e.target.value})} placeholder="Jalan {{hospital.address}}, Telp: {{hospital.phone}}, Faks: {{hospital.fax}}, WA/Telegram: {{hospital.whatsapp_phone}}" />}
                    {mode==='literal' && <Input className="min-w-[220px] flex-1" value={line.literal ?? ''} onChange={(e)=>patchLine(idx,{literal:e.target.value})} placeholder="e.g. Transthoracic Echocardiography Report"/>}
                    <Button type="button" variant="outline" size="sm" onClick={()=>moveLine(idx,'up')} disabled={idx===0}>↑</Button><Button type="button" variant="outline" size="sm" onClick={()=>moveLine(idx,'down')} disabled={idx===config.lines.length-1}>↓</Button><Button type="button" variant="destructive" size="sm" onClick={()=>removeLine(idx)}>Remove</Button>
                </div>
                {mode==='template' && <div className="space-y-1"><p className="text-xs text-muted-foreground">Insert hospital placeholders:</p><div className="flex flex-wrap gap-1">{textLinePaths.map((p)=><Button key={p} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={()=>patchLine(idx,{template:`${line.template ?? ''}{{hospital.${p}}}`})}>hospital.{p}</Button>)}</div></div>}
                {hospitalAttributes && <p className="text-xs text-muted-foreground">Preview: {preview || '—'}</p>}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                    <div><Label className="text-xs">Font</Label><Select value={line.font ?? 'sm'} onValueChange={(v)=>patchLine(idx,{font:v as FontSizeToken})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{FONT_SIZES.map((s)=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs">Weight</Label><Select value={line.weight ?? 'normal'} onValueChange={(v)=>patchLine(idx,{weight:v as FontWeightToken})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{WEIGHTS.map((w)=><SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs">Align</Label><Select value={line.align ?? 'center'} onValueChange={(v)=>patchLine(idx,{align:v as AlignToken})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ALIGNS.map((a)=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs">Top margin</Label><Select value={line.marginTop ?? 'none'} onValueChange={(v)=>patchLine(idx,{marginTop:v as SpacingToken})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{SPACINGS.map((s)=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                    <div className="flex items-end"><label className="inline-flex items-center gap-2 text-xs"><Checkbox checked={!!line.uppercase} onCheckedChange={(c)=>patchLine(idx,{uppercase:c===true})}/>Uppercase</label></div>
                    <div className="flex items-end"><label className="inline-flex items-center gap-2 text-xs"><Checkbox checked={line.visible !== false} onCheckedChange={(c)=>patchLine(idx,{visible:c===true})}/>Visible</label></div>
                </div>
            </div>})}
            <Button type="button" variant="secondary" onClick={addLine}>Add line</Button></div>
            <div className="flex items-center gap-3 rounded-md border p-3"><label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={!!config.divider?.visible} onCheckedChange={(c)=>patch({divider:{...(config.divider??{}),visible:c===true}})}/>Show divider under header</label></div>
            <p className="text-xs text-muted-foreground">Catalog: hospital attributes available to bindings — {ENTITY_BINDING_CATALOG.hospital.paths.length} paths</p>
        </div>;

    if (embedded === true) {
        return <>
            <div className="flex flex-row items-start justify-between gap-3">
                <div>
                    <CardTitle className="text-base">Header Block</CardTitle>
                    <p className="text-xs text-muted-foreground">Structured report header from hospital attributes, template strings, and literal text.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(DEFAULT_HEADER_CONFIG)}>Reset to RSUD Word-style header</Button>
            </div>
            {editorContent}
        </>;
    }

    return <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
                <CardTitle className="text-base">Header Block</CardTitle>
                <p className="text-xs text-muted-foreground">Structured report header from hospital attributes, template strings, and literal text.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(DEFAULT_HEADER_CONFIG)}>Reset to RSUD Word-style header</Button>
        </CardHeader>
        <CardContent className="space-y-5">
                {editorContent}
        </CardContent>
    </Card>;
}
