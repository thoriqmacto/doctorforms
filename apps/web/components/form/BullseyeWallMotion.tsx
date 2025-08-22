"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type WM = "N" | "H" | "A" | "An" | "D" | "U";

export type BullseyeValue = {
  model: "AHA17";
  scheme: "wall_motion_v1";
  segments: Record<string, { code: string; value: WM }>;
  updatedAt?: string;
};

const CYCLE: WM[] = ["N", "H", "A", "An", "D", "U"];
const COLORS: Record<WM, string> = {
  N: "fill-muted text-foreground",
  H: "fill-yellow-400/70",
  A: "fill-red-500/70",
  An: "fill-emerald-500/70",
  D: "fill-blue-500/70",
  U: "fill-gray-400/70",
};

type SegDef = { id: number; code: string; d: string };

const CENTER = 180;
const R_OUTER = 170;
const R_MID = 120;
const R_INNER = 70;
const R_APEX = 20;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ringSegPath(r0: number, r1: number, a0: number, a1: number) {
  const p1 = polar(CENTER, CENTER, r1, a0);
  const p2 = polar(CENTER, CENTER, r1, a1);
  const p3 = polar(CENTER, CENTER, r0, a1);
  const p4 = polar(CENTER, CENTER, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function circlePath(r: number) {
  return [
    `M ${CENTER} ${CENTER - r}`,
    `a ${r} ${r} 0 1 0 0 ${r * 2}`,
    `a ${r} ${r} 0 1 0 0 ${-r * 2}`,
    "Z",
  ].join(" ");
}

const SEGMENTS: SegDef[] = (() => {
  const segs: SegDef[] = [];
  const codes = [
    "basal-anterior",
    "basal-anteroseptal",
    "basal-inferoseptal",
    "basal-inferior",
    "basal-inferolateral",
    "basal-anterolateral",
    "mid-anterior",
    "mid-anteroseptal",
    "mid-inferoseptal",
    "mid-inferior",
    "mid-inferolateral",
    "mid-anterolateral",
    "apical-anterior",
    "apical-septal",
    "apical-inferior",
    "apical-lateral",
    "apex-cap",
  ];

  for (let i = 0; i < 6; i++) {
    const start = -30 + i * 60;
    const end = start + 60;
    segs.push({
      id: i + 1,
      code: codes[i],
      d: ringSegPath(R_MID, R_OUTER, start, end),
    });
  }

  for (let i = 0; i < 6; i++) {
    const start = -30 + i * 60;
    const end = start + 60;
    segs.push({
      id: i + 7,
      code: codes[i + 6],
      d: ringSegPath(R_INNER, R_MID, start, end),
    });
  }

  for (let i = 0; i < 4; i++) {
    const start = -45 + i * 90;
    const end = start + 90;
    segs.push({
      id: i + 13,
      code: codes[i + 12],
      d: ringSegPath(R_APEX, R_INNER, start, end),
    });
  }

  segs.push({ id: 17, code: codes[16], d: circlePath(R_APEX) });
  return segs;
})();

export function BullseyeWallMotion({
  value,
  onChange,
  className,
}: {
  value: BullseyeValue;
  onChange: (next: BullseyeValue) => void;
  className?: string;
}) {
  const setSeg = (id: number, next: WM) => {
    const seg = value.segments[String(id)];
    const updated: BullseyeValue = {
      ...value,
      segments: {
        ...value.segments,
        [id]: {
          code: seg?.code ?? SEGMENTS.find((s) => s.id === id)?.code ?? `seg-${id}`,
          value: next,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    onChange(updated);
  };

  const cycle = (curr: WM, shift: boolean) =>
    shift ? "N" : CYCLE[(CYCLE.indexOf(curr) + 1) % CYCLE.length];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative mx-auto w-[360px] h-[360px]">
        <svg viewBox="0 0 360 360" className="w-full h-full">
          <circle cx="180" cy="180" r="170" className="fill-transparent stroke-muted-foreground/30" />
          <circle cx="180" cy="180" r="120" className="fill-transparent stroke-muted-foreground/30" />
          <circle cx="180" cy="180" r="70" className="fill-transparent stroke-muted-foreground/30" />
          {SEGMENTS.map((s) => {
            const curr = (value.segments[String(s.id)]?.value ?? "N") as WM;
            return (
              <path
                key={s.id}
                d={s.d}
                className={cn("cursor-pointer stroke-background", COLORS[curr])}
                onClick={(e) => setSeg(s.id, cycle(curr, e.shiftKey))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSeg(s.id, "N");
                }}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {CYCLE.map((k) => (
          <button
            key={k}
            type="button"
            className={cn("inline-flex items-center gap-2 rounded-md border px-2 py-1", COLORS[k])}
            onClick={() => {
              const all = { ...value };
              Object.keys(all.segments).forEach((sid) => {
                all.segments[sid].value = k as WM;
              });
              all.updatedAt = new Date().toISOString();
              onChange(all);
            }}
            title={`Set all to ${k}`}
          >
            <span className="inline-block size-3 rounded-full bg-current/70" /> {k}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded-md border px-2 py-1"
          onClick={() => {
            const all = { ...value };
            Object.keys(all.segments).forEach((sid) => {
              all.segments[sid].value = "N";
            });
            all.updatedAt = new Date().toISOString();
            onChange(all);
          }}
        >
          Reset all to N
        </button>
      </div>
    </div>
  );
}

export function makeDefaultBullseye(): BullseyeValue {
  const segments: BullseyeValue["segments"] = {};
  SEGMENTS.forEach((s) => (segments[String(s.id)] = { code: s.code, value: "N" }));
  return { model: "AHA17", scheme: "wall_motion_v1", segments };
}
