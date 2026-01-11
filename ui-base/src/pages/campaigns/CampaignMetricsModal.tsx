"use client"

import { Pie, PieChart } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { Campaign } from "@/api/campaigns"

interface CampaignMetricsModalProps {
  open: boolean
  onClose: () => void
  campaign: Campaign | null
}

export function CampaignMetricsModal({
  open,
  onClose,
  campaign,
}: CampaignMetricsModalProps) {
  if (!campaign) return null

  // Use CSS that works with SVG - mixing with background creates visible shades
  const chartConfig = {
    value: {
      label: "Value",
    },
    open: {
      label: "Open",
      color: "hsl(0 0% 95%)", // Very light gray (will be visible on dark background)
    },
    click: {
      label: "Click",
      color: "hsl(0 0% 75%)", // Light gray
    },
    reply: {
      label: "Reply",
      color: "hsl(0 0% 55%)", // Medium gray
    },
    bounce: {
      label: "Bounce",
      color: "hsl(0 0% 35%)", // Dark gray
    },
    unsubscribe: {
      label: "Unsubscribe",
      color: "hsl(0 0% 20%)", // Very dark gray
    },
  } satisfies ChartConfig

  // Prepare chart data with distinct gray shades
  const chartData = [
    {
      metric: "open",
      value: campaign.emailsOpened ?? 0,
      fill: "hsl(0 0% 95%)",
    },
    {
      metric: "click",
      value: campaign.emailsClicked ?? 0,
      fill: "hsl(0 0% 75%)",
    },
    {
      metric: "reply",
      value: campaign.emailsReplied ?? 0,
      fill: "hsl(0 0% 55%)",
    },
    {
      metric: "bounce",
      value: campaign.emailsBounced ?? 0,
      fill: "hsl(0 0% 35%)",
    },
    {
      metric: "unsubscribe",
      value: campaign.unsubscribes ?? 0,
      fill: "hsl(0 0% 20%)",
    },
  ].filter((item) => item.value > 0) // Only show metrics with values > 0

  // Calculate total for display
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Campaign Metrics - {campaign.name || "Untitled Campaign"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 pb-4">
          {total === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              No engagement data available yet
            </div>
          ) : (
            <>
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[400px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="metric"
                    stroke="0"
                  />
                </PieChart>
              </ChartContainer>
              <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                {chartData.map((item) => (
                  <div key={item.metric} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm capitalize text-muted-foreground">
                      {item.metric}: <strong className="text-foreground">{item.value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

