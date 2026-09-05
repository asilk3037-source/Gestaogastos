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
              <stop offset="0%" stopColor="#0a84ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0a84ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="planejadoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#32ade6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#32ade6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e5ea" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8a8a8e", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#8a8a8e", fontSize: 11 }}
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
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 10px 24px -12px rgba(0,0,0,0.25)",
            }}
            labelStyle={{ color: "#1d1d1f", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="planejadoCents"
            stroke="#32ade6"
            strokeWidth={2}
            fill="url(#planejadoFill)"
          />
          <Area type="monotone" dataKey="gastoCents" stroke="#0a84ff" strokeWidth={2} fill="url(#gastoFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
