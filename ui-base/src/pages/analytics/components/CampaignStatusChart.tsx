"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { CampaignStatusDistribution } from "@/api/analyticsTypes";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  draft: {
    label: "Draft",
    color: "hsl(var(--muted))",
  },
  active: {
    label: "Active",
    color: "hsl(142, 76%, 36%)",
  },
  paused: {
    label: "Paused",
    color: "hsl(38, 92%, 50%)",
  },
  completed: {
    label: "Completed",
    color: "hsl(221, 83%, 53%)",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig;

interface CampaignStatusChartProps {
  data: CampaignStatusDistribution | null;
  loading?: boolean;
}

export function CampaignStatusChart({
  data,
  loading,
}: CampaignStatusChartProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[250px] w-[250px] rounded-full" />
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return null;
  }

  const chartData = [
    { name: "Draft", value: data.draft, fill: "var(--color-draft)" },
    { name: "Active", value: data.active, fill: "var(--color-active)" },
    { name: "Paused", value: data.paused, fill: "var(--color-paused)" },
    { name: "Completed", value: data.completed, fill: "var(--color-completed)" },
    { name: "Cancelled", value: data.cancelled, fill: "var(--color-cancelled)" },
  ].filter((item) => item.value > 0);

  const COLORS = [
    "hsl(var(--muted))",
    "hsl(142, 76%, 36%)",
    "hsl(38, 92%, 50%)",
    "hsl(221, 83%, 53%)",
    "hsl(0, 84%, 60%)",
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Campaign Status Distribution</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Breakdown of campaigns by status
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium">{data.name}</span>
                          <span className="text-sm font-bold">{data.value}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {((data.value / data.total) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

