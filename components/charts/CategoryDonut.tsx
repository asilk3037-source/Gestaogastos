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
            data={hasData ? data.filter((d) => d.value > 0) : [{ name: "Sem gastos", value: 1, color: "#242240" }]}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={hasData ? 2 : 0}
            stroke="none"
          >
            {(hasData ? data.filter((d) => d.value > 0) : [{ name: "Sem gastos", value: 1, color: "#242240" }]).map(
              (slice, idx) => (
                <Cell key={idx} fill={slice.color} />
              )
            )}
          </Pie>
          {hasData && (
            <Tooltip
              formatter={(value: number, name: string) => [centsToBRL(value), name]}
              contentStyle={{
                background: "#16152a",
                border: "1px solid #2a2843",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: "#e2e8f0" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-white">{centsToBRL(totalCents)}</span>
        <span className="text-xs text-slate-400">Total do mês</span>
      </div>
    </div>
  );
}
