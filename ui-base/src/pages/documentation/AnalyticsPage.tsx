import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function AnalyticsPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        The Analytics dashboard provides comprehensive insights into your email marketing
        performance, helping you understand campaign effectiveness, user engagement, and
        organizational metrics. With real-time data visualization, detailed reporting, and
        multi-level filtering, you can make data-driven decisions to optimize your email
        marketing strategy.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Real-time KPI dashboard with engagement metrics, campaign performance tracking with
        detailed analytics, user-wise analytics for team performance insights, organization-wide
        metrics for multi-tenant visibility, platform-wide analytics for SUPERADMIN oversight,
        date range filtering for historical analysis, email status breakdown and distribution,
        campaign status tracking, export capabilities for reporting, and interactive drill-down
        into detailed email lists.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The analytics dashboard provides comprehensive capabilities for monitoring and analyzing
        your email marketing performance:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">KPI Dashboard</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Total users (active and inactive) with status breakdown</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Total contacts, templates, and campaigns across organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email metrics: sent, delivered, opened, clicked, bounced, failed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Engagement metrics: open rate, click rate, bounce rate, delivery rate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign status breakdown: active, completed, paused, draft, cancelled</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Platform-wide metrics for SUPERADMIN: total organizations, revenue, subscription breakdown</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Campaign Analytics</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Individual campaign performance with detailed metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign creator information and status tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Total recipients, emails sent, and delivery statistics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Engagement rates: open rate, click rate, bounce rate per campaign</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email status breakdown: delivered, opened, clicked, bounced, replied, complained</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Clickable metrics for drill-down into detailed email lists</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">User Analytics</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User-wise performance metrics with full name and role</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Templates created and used by each user</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaigns created per user with activity tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email sending activity: sent, bounced, opened, clicked, replied</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User engagement rates: open rate, click rate, bounce rate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Unsubscribes attributed to each user's campaigns</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Organization Analytics</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization-wide resource counts: users, contacts, lists, templates, campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription plan information and revenue tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Cross-organization performance comparisons</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization slug and name for easy identification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Platform-wide analytics for SUPERADMIN oversight</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription breakdown: Trial, Starter, Pro, Scale plans</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to effectively use the analytics dashboard:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Access the Analytics Dashboard</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Navigate to the Analytics page from the main navigation. The dashboard automatically
              loads with default settings showing the last 7 days of data. You'll see the KPI
              cards at the top displaying key metrics, followed by detailed analytics tables below.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Set Date Range</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use the date filter at the top of the dashboard to select your analysis period.
              Choose from preset ranges (Last 7 days, Last 30 days, Last 90 days, This month,
              Last month) or select a custom date range. The date range applies to all metrics
              and tables on the dashboard, allowing you to analyze historical performance or
              focus on specific time periods.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Filter by User (Optional)</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              If you're an Admin or Owner, you can filter analytics by a specific user to see
              their individual performance. Select a user from the user filter dropdown to view
              only campaigns and metrics associated with that user. This is useful for performance
              reviews, identifying top performers, or analyzing individual team member contributions.
              Regular users automatically see only their own data.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Review KPI Metrics</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Examine the KPI cards at the top of the dashboard to get an overview of your
              performance. Key metrics include total users (with active/inactive breakdown),
              contacts, templates, campaigns, email statistics (sent, delivered, opened, clicked,
              bounced), and engagement rates (open rate, click rate, bounce rate, delivery rate).
              These metrics update based on your selected date range and user filter.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Analyze Campaign Performance</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Scroll to the Campaign Performance table to see detailed metrics for each campaign.
              The table shows campaign name, creator, status, recipient counts, email statistics,
              and engagement rates. Click on any metric (e.g., "Opened", "Clicked") to drill down
              into a detailed list of emails with that status. Use sorting and pagination to
              navigate through campaigns and identify top performers.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            6
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Review User Analytics</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Check the User Analytics table to see team performance metrics. Each row shows a
              user's activity including templates created/used, campaigns created, email sending
              statistics, and engagement rates. Click on metrics to see detailed email lists.
              This helps identify top performers, training opportunities, and team productivity
              patterns. Export the data to CSV for reporting or further analysis.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            7
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Platform View (SUPERADMIN Only)</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              If you're a SUPERADMIN employee, toggle the "Platform View" switch to see
              organization-wide analytics across all tenants. This view shows total organizations,
              total revenue from subscriptions, subscription plan breakdown (Trial, Starter,
              Pro, Scale), and aggregated metrics across all organizations. Use the organization
              filter to focus on specific organizations or view all organizations together.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            8
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Export Data</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use the export buttons on each analytics table to download data as CSV files.
              Exported files include all visible columns and can be used for external reporting,
              analysis in spreadsheet applications, or sharing with stakeholders. The export
              respects your current filters (date range, user filter) and includes audit
              information like export timestamp and user details.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Analytics Views and Scenarios</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The analytics dashboard supports multiple views and filtering scenarios:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization View (Default)</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            Regular users and organization admins see analytics filtered by their organization.
            This is the default view that shows:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>All users, contacts, templates, and campaigns within the organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization-wide email statistics and engagement metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign performance across all organization members</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User analytics for all team members in the organization</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">User-Specific View</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            Regular users automatically see only their own data. Admins and Owners can filter
            by a specific user to analyze individual performance:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaigns created by the selected user</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email statistics for emails sent from that user's campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Templates created and used by the user</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User-specific engagement rates and performance metrics</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Platform View (SUPERADMIN)</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            SUPERADMIN employees can toggle platform view to see analytics across all
            organizations:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Total organizations count and subscription breakdown</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Total revenue from active subscriptions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Aggregated metrics across all organizations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization Analytics table showing all organizations with their metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Ability to filter by specific organization or view all together</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Date Range Filtering</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            All analytics can be filtered by date range for historical analysis:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Preset ranges: Last 7 days, Last 30 days, Last 90 days, This month, Last month</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom date range selection for specific periods</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Date range applies to all metrics: emails, campaigns, user activity</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Date range persists in session storage for convenience</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Understanding Metrics</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Understanding your analytics metrics is crucial for optimizing your email marketing
        strategy. Here's how to interpret key metrics:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Open Rate</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The open rate indicates the percentage of delivered emails that were opened by
            recipients. Calculated as (emails opened / emails delivered) × 100. A good open rate
            typically ranges from 20-25% for marketing emails. Factors affecting open rates include
            subject line quality and relevance, sender reputation, send time and frequency, email
            list quality, and email client rendering. Higher open rates indicate better engagement
            and relevance of your content.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Click-Through Rate (CTR)</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The click-through rate measures the percentage of delivered emails that resulted in
            clicks on links. Calculated as (emails clicked / emails delivered) × 100. A good CTR
            is typically 2-5% for marketing emails. To improve CTR, use clear and compelling
            call-to-action buttons, make links visually prominent, ensure content is relevant and
            valuable, test different link placements, and personalize content based on recipient
            interests. Higher CTR indicates stronger engagement and interest in your offerings.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Bounce Rate</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The bounce rate indicates the percentage of emails that couldn't be delivered.
            Calculated as (emails bounced / emails sent) × 100. Bounces can be hard bounces
            (permanent delivery failures like invalid email addresses) or soft bounces
            (temporary delivery issues like full inbox or server problems). A high bounce rate
            (above 2%) may indicate list quality issues. Regularly clean your contact list to
            maintain low bounce rates and protect sender reputation.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Delivery Rate</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The delivery rate shows the percentage of emails successfully delivered to recipients'
            inboxes. Calculated as (emails delivered / emails sent) × 100. High delivery rates
            (above 95%) indicate good sender reputation and list quality. Low delivery rates may
            indicate issues with email authentication, sender reputation, or list quality that
            need to be addressed.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Reply Rate</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The reply rate shows how many recipients responded to your emails. Higher reply rates
            indicate strong engagement and can help improve sender reputation. Replies are tracked
            automatically when recipients reply to campaign emails, providing insights into
            two-way communication and engagement quality.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Email Status Breakdown</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Emails progress through various statuses: Queued (waiting to be sent), Sending
            (currently being sent), Sent (sent to recipient), Delivered (successfully delivered
            to inbox), Opened (recipient opened the email), Clicked (recipient clicked a link),
            Bounced (delivery failed), Failed (sending error occurred), Replied (recipient replied),
            Complained (marked as spam), and Unsubscribed (recipient unsubscribed). Understanding
            this flow helps identify where emails may be getting stuck or where engagement drops.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The analytics system is built on a flexible, multi-tenant architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization-Based Filtering</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All analytics queries automatically filter by organizationId to ensure data isolation.
            Regular users see only their organization's data, while SUPERADMIN employees can
            access platform-wide analytics. The filtering is enforced at the service layer,
            ensuring security and data privacy across all analytics endpoints.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">User Context and Permissions</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Analytics access is controlled by user roles and permissions. Regular users see only
            their own campaign data, while Admins and Owners can view organization-wide analytics.
            SUPERADMIN employees have access to platform-wide analytics. The system uses
            UserContextService to determine the current user's role and organization, applying
            appropriate filters automatically.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Date Range Filtering</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All analytics queries support date range filtering using startDate and endDate
            parameters. The date filtering applies to email messages (based on sentAt timestamp),
            campaigns (based on createdAt), and user activity. This allows for historical analysis,
            trend identification, and period-over-period comparisons.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Real-Time Data Aggregation</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Analytics are calculated in real-time from the database, ensuring accuracy and
            up-to-date metrics. The system aggregates data from multiple tables (email_messages,
            campaigns, users, contacts, templates) to provide comprehensive insights. Complex
            queries with JOINs and aggregations are optimized for performance, with pagination
            support for large datasets.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Pagination and Performance</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All analytics tables support server-side pagination to handle large datasets efficiently.
            The system uses limit and offset parameters for pagination, with total count tracking
            for accurate page calculations. This ensures fast loading times even with thousands
            of campaigns, users, or organizations.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Export Functionality</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Analytics data can be exported to CSV format for external analysis and reporting.
            The export includes all visible columns from the table, respects current filters
            (date range, user filter), and includes audit information like export timestamp and
            user details. Exports are generated client-side for immediate download.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To get the most value from your analytics dashboard:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Regular Monitoring</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Check analytics regularly (daily or weekly) to stay informed about campaign performance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Set up regular review schedules to identify trends and patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Compare metrics across different time periods to identify improvements or declines</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor bounce rates and delivery rates to maintain sender reputation</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Data-Driven Decisions</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use analytics to inform campaign strategy and content decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test different approaches (subject lines, send times, content) and compare results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Focus on metrics that align with your business goals (engagement, conversions, revenue)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Identify top-performing campaigns and replicate successful strategies</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Team Performance Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use user analytics to identify top performers and recognize achievements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Identify team members who may need additional training or support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Set performance goals based on historical analytics data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use analytics for performance reviews and team planning</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Continuous Improvement</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Identify underperforming campaigns and optimize them based on analytics insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Learn from successful campaigns and replicate effective strategies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly clean your contact list based on engagement data (remove inactive contacts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor bounce rates and remove invalid email addresses promptly</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Reporting and Communication</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Export analytics data regularly for stakeholder reporting and documentation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Share key metrics with team members to keep everyone informed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use analytics to demonstrate ROI and campaign effectiveness to management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Create regular reports comparing period-over-period performance</span>
            </li>
          </ul>
        </div>
      </div>

      <DocCallout variant="info" title="Industry Benchmarks">
        Compare your metrics against industry benchmarks, but remember that your audience and
        goals are unique. Focus on improving your own metrics over time rather than comparing
        to generic benchmarks. Typical benchmarks: Open Rate 20-25%, Click Rate 2-5%, Bounce
        Rate &lt;2%, Delivery Rate &gt;95%. Your actual performance may vary based on industry,
        audience, and email type.
      </DocCallout>

      <h2 className="text-xl font-bold">Related Documentation</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Learn more about related features:
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <a
          href="/documentation/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Learn how to create and manage campaigns that are tracked in analytics
          </p>
        </a>
        <a
          href="/documentation/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand contact management and how contacts are tracked in analytics
          </p>
        </a>
        <a
          href="/documentation/templates"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Email Templates</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            See how template usage is tracked in user analytics
          </p>
        </a>
        <a
          href="/documentation/user-management"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">User Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand user roles and permissions that affect analytics access
          </p>
        </a>
      </div>
    </DocContent>
  );
}
