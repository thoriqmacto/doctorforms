'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

/*
 * HeaderConfigEditor
 *
 * Right-pane editor for templates.header_config. The config is the new
 * primary source for the report header — replaces the ten static fields
 * admins used to drop into the "Header" section.
 *
 * Each line is either a `binding` (hospital-attribute-driven) or a
 * `literal` (verbatim text). Admin picks layout, font size, weight,
 * alignment, uppercase, top-margin, and visibility per line. Logos are
 * two slots (left / right) sourced from hospital.* fields.
 */

type Props = {
    value: HeaderConfig | null;
    onChange: (next: HeaderConfig) => void;
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
        right: { binding: { source: 'hospital', path: 'secondary_logo_url' }, size: 'lg', visible: false },
    },
    lines: [
        { binding: { source: 'hospital', path: 'parent_org_line' }, font: 'sm',  weight: 'bold',   align: 'center', uppercase: true },
        { binding: { source: 'hospital', path: 'name' },            font: 'lg',  weight: 'bold',   align: 'center', uppercase: true },
        { binding: { source: 'hospital', path: 'address' },         font: 'xs',  weight: 'normal', align: 'center' },
        { binding: { source: 'hospital', path: 'phone' },           font: 'xs',  weight: 'normal', align: 'center' },
        { binding: { source: 'hospital', path: 'city' },            font: 'md',  weight: 'bold',   align: 'center', uppercase: true },
    ],
    divider: { visible: true, thicknessPt: 0.75 },
};

export default function HeaderConfigEditor({ value, onChange }: Props) {
    const config: HeaderConfig = value ?? DEFAULT_HEADER_CONFIG;

    // Only hospital bindings are offered — other entities don't belong in a
    // letterhead header. Keeps the UI narrow and the data stable.
    const hospitalPaths = useMemo(() => bindingPathsFor('hospital'), []);

    function patch(next: Partial<HeaderConfig>) {
        onChange({ ...config, ...next });
    }

    function patchLine(idx: number, next: Partial<HeaderLine>) {
        const lines = config.lines.slice();
        lines[idx] = { ...lines[idx], ...next };
        patch({ lines });
    }

    function patchLogo(slot: 'left' | 'right', next: Partial<HeaderLogoSlot>) {
        patch({
            logo: {
                ...config.logo,
                [slot]: { ...(config.logo[slot] ?? {}), ...next },
            },
        });
    }

    function addLine() {
        patch({
            lines: [
                ...config.lines,
                { literal: '', font: 'sm', weight: 'normal', align: 'center' },
            ],
        });
    }

    function removeLine(idx: number) {
        patch({ lines: config.lines.filter((_, i) => i !== idx) });
    }

    function moveLine(idx: number, direction: 'up' | 'down') {
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= config.lines.length) return;
        const lines = config.lines.slice();
        [lines[idx], lines[target]] = [lines[target], lines[idx]];
        patch({ lines });
    }

    function setBindingPath(idx: number, path: string) {
        patchLine(idx, {
            binding: { source: 'hospital', path } as Binding,
            literal: undefined,
        });
    }

    function setLiteral(idx: number, literal: string) {
        patchLine(idx, {
            literal,
            binding: undefined,
        });
    }

    function resetToDefault() {
        onChange(DEFAULT_HEADER_CONFIG);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                    <CardTitle className="text-base">Header Block</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Structured report header. Each line binds to a hospital
                        attribute or holds literal text. Logos render at the two
                        outer columns of the three-column layout.
                    </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetToDefault}>
                    Reset to default
                </Button>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Logos ----------------------------------------------------- */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(['left', 'right'] as const).map((slot) => {
                        const logo = config.logo[slot];
                        const path = logo?.binding?.source === 'hospital' ? logo.binding.path : '';
                        return (
                            <div key={slot} className="space-y-2 rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                    <Label className="font-medium capitalize">{slot} logo</Label>
                                    <label className="inline-flex items-center gap-2 text-xs">
                                        <Checkbox
                                            checked={logo?.visible ?? false}
                                            onCheckedChange={(c) => patchLogo(slot, { visible: c === true })}
                                        />
                                        Visible
                                    </label>
                                </div>
                                <div>
                                    <Label className="text-xs">Hospital attribute</Label>
                                    <Select
                                        value={path}
                                        onValueChange={(v) =>
                                            patchLogo(slot, {
                                                binding: { source: 'hospital', path: v },
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select attribute" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {hospitalPaths
                                                .filter((p) => p.includes('logo_url'))
                                                .map((p) => (
                                                    <SelectItem key={p} value={p}>
                                                        hospital.{p}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Size</Label>
                                    <Select
                                        value={logo?.size ?? 'lg'}
                                        onValueChange={(v) => patchLogo(slot, { size: v as ImageSizeToken })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {IMAGE_SIZES.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Lines ----------------------------------------------------- */}
                <div className="space-y-2">
                    <Label className="font-medium">Header lines</Label>
                    {config.lines.map((line, idx) => {
                        const mode: 'binding' | 'literal' = line.binding ? 'binding' : 'literal';
                        const path = line.binding?.source === 'hospital' ? line.binding.path : '';

                        return (
                            <div key={idx} className="space-y-2 rounded-md border p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select
                                        value={mode}
                                        onValueChange={(v) => {
                                            if (v === 'binding') {
                                                setBindingPath(idx, path || 'name');
                                            } else {
                                                setLiteral(idx, line.literal ?? '');
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="binding">Hospital field</SelectItem>
                                            <SelectItem value="literal">Literal text</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {mode === 'binding' ? (
                                        <Select value={path} onValueChange={(v) => setBindingPath(idx, v)}>
                                            <SelectTrigger className="min-w-[220px] flex-1">
                                                <SelectValue placeholder="Select attribute" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {hospitalPaths
                                                    .filter((p) => !p.includes('logo_url'))
                                                    .map((p) => (
                                                        <SelectItem key={p} value={p}>
                                                            hospital.{p}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            className="min-w-[220px] flex-1"
                                            value={line.literal ?? ''}
                                            onChange={(e) => setLiteral(idx, e.target.value)}
                                            placeholder="e.g. Transthoracic Echocardiography Report"
                                        />
                                    )}

                                    <Button type="button" variant="outline" size="sm" onClick={() => moveLine(idx, 'up')} disabled={idx === 0}>
                                        ↑
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveLine(idx, 'down')} disabled={idx === config.lines.length - 1}>
                                        ↓
                                    </Button>
                                    <Button type="button" variant="destructive" size="sm" onClick={() => removeLine(idx)}>
                                        Remove
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                                    <div>
                                        <Label className="text-xs">Font</Label>
                                        <Select value={line.font ?? 'sm'} onValueChange={(v) => patchLine(idx, { font: v as FontSizeToken })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {FONT_SIZES.map((s) => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Weight</Label>
                                        <Select value={line.weight ?? 'normal'} onValueChange={(v) => patchLine(idx, { weight: v as FontWeightToken })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {WEIGHTS.map((w) => (
                                                    <SelectItem key={w} value={w}>{w}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Align</Label>
                                        <Select value={line.align ?? 'center'} onValueChange={(v) => patchLine(idx, { align: v as AlignToken })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {ALIGNS.map((a) => (
                                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Top margin</Label>
                                        <Select value={line.marginTop ?? 'none'} onValueChange={(v) => patchLine(idx, { marginTop: v as SpacingToken })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {SPACINGS.map((s) => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="inline-flex items-center gap-2 text-xs">
                                            <Checkbox
                                                checked={!!line.uppercase}
                                                onCheckedChange={(c) => patchLine(idx, { uppercase: c === true })}
                                            />
                                            Uppercase
                                        </label>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <Button type="button" variant="secondary" onClick={addLine}>
                        Add line
                    </Button>
                </div>

                {/* Divider -------------------------------------------------- */}
                <div className="flex items-center gap-3 rounded-md border p-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={!!config.divider?.visible}
                            onCheckedChange={(c) =>
                                patch({
                                    divider: {
                                        ...(config.divider ?? {}),
                                        visible: c === true,
                                    },
                                })
                            }
                        />
                        Show divider under header
                    </label>
                </div>

                <p className="text-xs text-muted-foreground">
                    Catalog: hospital attributes available to bindings —{' '}
                    {ENTITY_BINDING_CATALOG.hospital.paths.length} paths
                </p>
            </CardContent>
        </Card>
    );
}
