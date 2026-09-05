"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { centsToBRL } from "@/lib/format";

export interface EvolutionPoint {
  label: string;
  planejadoCents: number;
  gastoCents: number;
}

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="gastoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="planejadoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242240" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => Math.round(v / 100).toLocaleString("pt-BR")}
            width={56}
            domain={[0, "auto"]}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              centsToBRL(value),
              name === "gastoCents" ? "Gasto" : "Planejado",
            ]}
            contentStyle={{
              background: "#16152a",
              border: "1px solid #2a2843",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Area
            type="monotone"
            dataKey="planejadoCents"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#planejadoFill)"
          />
          <Area type="monotone" dataKey="gastoCents" stroke="#8b5cf6" strokeWidth={2} fill="url(#gastoFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
