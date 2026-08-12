"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import type { ChartPoint } from "@/lib/dashboard-data";
import { fmt } from "@/lib/utils";

export function Sparkline({
  data,
  color = "var(--primary)",
  width = 72,
  height = 30,
  bars = false,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  bars?: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * width;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);

  if (bars) {
    const bw = width / data.length - 2;
    return (
      <svg width={width} height={height} className="overflow-visible">
        {data.map((v, i) => (
          <rect
            key={i}
            x={x(i) - bw / 2}
            y={y(v)}
            width={bw}
            height={height - 3 - y(v)}
            rx={2}
            fill={color}
            opacity={0.35 + (i / data.length) * 0.5}
          />
        ))}
      </svg>
    );
  }
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.5} fill={color} />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-mono text-ink-3">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-ink-2">
            {p.dataKey === "trend" ? "Ağırlık" : "Alım"}:
          </span>
          <span className="font-semibold text-ink">
            {p.dataKey === "trend" ? `${fmt(p.value, 1)} kg` : `${fmt(p.value)} kcal`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeightEnergyChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tick={{ fontSize: 11 }}
        />
        <YAxis yAxisId="w" domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={38} />
        <YAxis yAxisId="c" orientation="right" domain={[0, "dataMax + 600"]} hide />
        <Tooltip content={<ChartTooltip />} />
        <Bar yAxisId="c" dataKey="calories" fill="var(--accent)" opacity={0.22} radius={[3, 3, 0, 0]} maxBarSize={16} />
        <Area
          yAxisId="w"
          type="monotone"
          dataKey="trend"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#wgrad)"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TdeeHistoryChart({ data }: { data: { label: string; tdee: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis domain={["dataMin - 120", "dataMax + 120"]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={52} />
        <Tooltip
          content={({ active, payload, label }: any) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                <div className="font-mono text-ink-3">{label}</div>
                <div className="font-semibold text-ink">{fmt(payload[0].value)} kcal</div>
              </div>
            ) : null
          }
        />
        <Line type="monotone" dataKey="tdee" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Ring({ value, max, size = 108 }: { value: number; max: number; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={11} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" className="fill-ink" style={{ fontSize: 20, fontWeight: 700 }}>
        {Math.round(pct * 100)}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-ink-3" style={{ fontSize: 10, fontFamily: "var(--mono)" }}>
        hedef
      </text>
    </svg>
  );
}
