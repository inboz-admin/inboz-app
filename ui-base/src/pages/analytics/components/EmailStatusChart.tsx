"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { EmailStatusBreakdown } from "@/api/analyticsTypes";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  queued: {
    label: "Queued",
    color: "hsl(var(--muted))",
  },
  sending: {
    label: "Sending",
    color: "hsl(221, 83%, 53%)",
  },
  sent: {
    label: "Sent",
    color: "hsl(142, 76%, 36%)",
  },
  delivered: {
    label: "Delivered",
    color: "hsl(142, 76%, 50%)",
  },
  bounced: {
    label: "Bounced",
    color: "hsl(0, 84%, 60%)",
  },
  failed: {
    label: "Failed",
    color: "hsl(0, 72%, 51%)",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(0, 0%, 45%)",
  },
} satisfies ChartConfig;

interface EmailStatusChartProps {
  data: EmailStatusBreakdown | null;
  loading?: boolean;
}

export function EmailStatusChart({
  data,
  loading,
}: EmailStatusChartProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="h-[300px]">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return null;
  }

  const chartData = [
    { status: "Queued", count: data.queued, fill: "var(--color-queued)" },
    { status: "Sending", count: data.sending, fill: "var(--color-sending)" },
    { status: "Sent", count: data.sent, fill: "var(--color-sent)" },
    { status: "Delivered", count: data.delivered, fill: "var(--color-delivered)" },
    { status: "Bounced", count: data.bounced, fill: "var(--color-bounced)" },
    { status: "Failed", count: data.failed, fill: "var(--color-failed)" },
    { status: "Cancelled", count: data.cancelled, fill: "var(--color-cancelled)" },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Email Delivery Status</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Breakdown of emails by delivery status
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="status"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const tooltipData = payload[0];
                  const total = data?.total || 0;
                  const percentage = total > 0
                    ? ((tooltipData.value as number) / total) * 100
                    : 0;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium">{tooltipData.name}</span>
                          <span className="text-sm font-bold">{tooltipData.value?.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="var(--color-delivered)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

