"use client";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileX } from "lucide-react";
import type { KpiStats } from "@/api/analyticsTypes";

interface KpiCardsProps {
  data: KpiStats | null;
  loading?: boolean;
  platformView?: boolean;
}

export function KpiCards({ data, loading, platformView = false }: KpiCardsProps) {
  if (loading) {
    const cardCount = platformView ? 8 : 8;
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <CardDescription>Loading...</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                --
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
        <div className="mb-4">
          <FileX className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          There is no analytics data available for the selected organization or date range.
        </p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Platform view cards: Organizations, Users, Subscriptions, Revenue, Contacts, Templates, Campaigns, Emails Sent
  if (platformView) {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Organizations Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Organizations</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(data.totalOrganizations || 0)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Total organizations
            </div>
            <div className="text-muted-foreground">
              All organizations on platform
            </div>
          </CardFooter>
        </Card>

        {/* Total Users Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(data.totalUsers.total)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              {data.totalUsers.active >= data.totalUsers.inactive ? "Strong user base" : "User activity needs attention"}
            </div>
            <div className="text-muted-foreground">
              {data.totalUsers.active} active, {data.totalUsers.inactive} inactive users
            </div>
          </CardFooter>
        </Card>

        {/* Subscription Breakdown Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Subscriptions</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(
                (data.subscriptionBreakdown?.trial || 0) +
                (data.subscriptionBreakdown?.starter || 0) +
                (data.subscriptionBreakdown?.pro || 0) +
                (data.subscriptionBreakdown?.scale || 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Active subscriptions
            </div>
            <div className="text-muted-foreground">
              Trial: {formatNumber(data.subscriptionBreakdown?.trial || 0)}, 
              Starter: {formatNumber(data.subscriptionBreakdown?.starter || 0)}, 
              Pro: {formatNumber(data.subscriptionBreakdown?.pro || 0)}, 
              Scale: {formatNumber(data.subscriptionBreakdown?.scale || 0)}
            </div>
          </CardFooter>
        </Card>

        {/* Total Revenue Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Revenue Generated</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCurrency(data.totalRevenue || 0)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Total subscription revenue
            </div>
            <div className="text-muted-foreground">
              From active paid subscriptions
            </div>
          </CardFooter>
        </Card>

        {/* Total Contacts Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Contacts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(data.totalContacts)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Growing contact database
            </div>
            <div className="text-muted-foreground">
              All contact records in system
            </div>
          </CardFooter>
        </Card>

        {/* Total Templates Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Templates</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(data.totalTemplates)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Email templates available
            </div>
            <div className="text-muted-foreground">
              Available email templates
            </div>
          </CardFooter>
        </Card>

        {/* Total Campaigns Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(data.totalCampaigns)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Campaigns across all organizations
            </div>
            <div className="text-muted-foreground">
              {formatNumber(data.activeCampaigns || 0)} active campaigns
            </div>
          </CardFooter>
        </Card>

        {/* Total Emails Sent Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Emails Sent</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(data.totalEmailsSent)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              Emails successfully sent
            </div>
            <div className="text-muted-foreground">
              Total sent and delivered emails
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Regular organization view cards (existing cards)
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Users Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.totalUsers.total)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {data.totalUsers.active >= data.totalUsers.inactive ? "Strong user base" : "User activity needs attention"}
          </div>
          <div className="text-muted-foreground">
            {data.totalUsers.active} active, {data.totalUsers.inactive} inactive users
          </div>
        </CardFooter>
      </Card>

      {/* Total Contacts Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Contacts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.totalContacts)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Growing contact database
          </div>
          <div className="text-muted-foreground">
            All contact records in system
          </div>
        </CardFooter>
      </Card>

      {/* Total Templates Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Templates</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.totalTemplates)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Email templates available
          </div>
          <div className="text-muted-foreground">
            Available email templates
          </div>
        </CardFooter>
      </Card>

      {/* Total Emails Sent Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Emails Sent</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.totalEmailsSent)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Emails successfully sent
          </div>
          <div className="text-muted-foreground">
            Total sent and delivered emails
          </div>
        </CardFooter>
      </Card>

      {/* Email Open Rate Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Email Open Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.engagementMetrics?.openRate?.toFixed(1) || "0.0"}%
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {data.engagementMetrics?.openRate >= 20 ? "Strong engagement" : "Needs improvement"}
          </div>
          <div className="text-muted-foreground">
            {formatNumber(data.totalEmailsOpened || 0)} opened out of {formatNumber(data.totalEmailsSent || 0)} sent
          </div>
        </CardFooter>
      </Card>

      {/* Email Click Rate Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Email Click Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.engagementMetrics?.clickRate?.toFixed(1) || "0.0"}%
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {data.engagementMetrics?.clickRate >= 3 ? "Good click-through" : "Low engagement"}
          </div>
          <div className="text-muted-foreground">
            {formatNumber(data.totalEmailsClicked || 0)} clicked out of {formatNumber(data.totalEmailsSent || 0)} sent
          </div>
        </CardFooter>
      </Card>

      {/* Email Bounce Rate Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Email Bounce Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.engagementMetrics?.bounceRate?.toFixed(1) || "0.0"}%
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {data.engagementMetrics?.bounceRate <= 2 ? "Low bounce rate" : "High bounce rate"}
          </div>
          <div className="text-muted-foreground">
            {formatNumber(data.totalEmailsBounced || 0)} bounced out of {formatNumber(data.totalEmailsSent || 0)} sent
          </div>
        </CardFooter>
      </Card>

      {/* Active Campaigns Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Campaigns</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.activeCampaigns || 0)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Currently running campaigns
          </div>
          <div className="text-muted-foreground">
            {formatNumber(data.activeCampaigns || 0)} of {formatNumber(data.totalCampaigns || 0)} total campaigns
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

