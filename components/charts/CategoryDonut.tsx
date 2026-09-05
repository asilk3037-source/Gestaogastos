"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { centsToBRL } from "@/lib/format";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function CategoryDonut({ data, totalCents }: { data: DonutSlice[]; totalCents: number }) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={hasData ? data.filter((d) => d.value > 0) : [{ name: "Sem gastos", value: 1, color: "#e5e5ea" }]}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={hasData ? 2 : 0}
            stroke="none"
          >
            {(hasData ? data.filter((d) => d.value > 0) : [{ name: "Sem gastos", value: 1, color: "#e5e5ea" }]).map(
              (slice, idx) => (
                <Cell key={idx} fill={slice.color} />
              )
            )}
          </Pie>
          {hasData && (
            <Tooltip
              formatter={(value: number, name: string) => [centsToBRL(value), name]}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "0 10px 24px -12px rgba(0,0,0,0.25)",
              }}
              itemStyle={{ color: "#1d1d1f" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-slate-100">{centsToBRL(totalCents)}</span>
        <span className="text-xs text-slate-400">Total do mês</span>
      </div>
    </div>
  );
}
