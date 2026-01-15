import { DocContent, DocCallout, DocFeatureList } from "@/components/documentation/DocContent";

export default function OverviewPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        A comprehensive, multi-tenant SaaS platform designed to empower organizations
        to create, manage, and track email marketing campaigns with ease. Built with
        modern technologies including NestJS, React, and MySQL, the platform provides
        enterprise-grade features like role-based access control, automated email
        sequences, real-time analytics, and seamless Gmail integration for reliable
        email delivery.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Manage contacts with bulk import, create beautiful HTML email templates with
        personalization variables, design sophisticated multi-step automated campaigns
        with conditional triggers, track email delivery and engagement in real-time,
        analyze performance with comprehensive dashboards, manage team members with
        granular permissions, and handle subscriptions with flexible billing plans—all
        from a single, intuitive interface.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The Email Campaign Tool offers a wide range of features designed to streamline
        your email marketing workflow:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">Contact Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Centralized contact database with custom fields and metadata</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Bulk contact upload via CSV/Excel with validation and error handling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription status management (subscribed, unsubscribed, bounced)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Advanced search, filtering, and segmentation capabilities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Contact list organization and management</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Email Templates</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Rich HTML email template editor with WYSIWYG support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Dynamic variable substitution for personalization (name, email, custom fields)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Template categories, tags, and versioning system</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Reusable template library with sharing capabilities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Template preview and compliance validation</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Campaign Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Multi-step automated email sequences with conditional logic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Flexible scheduling: immediate, delayed, or reply-based triggers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time campaign tracking with status monitoring (active, paused, completed)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email delivery status monitoring (sent, delivered, opened, clicked, bounced)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign cloning, A/B testing, and performance optimization</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Analytics & Reporting</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Comprehensive analytics dashboard with visual charts and graphs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign performance metrics (delivery rate, open rate, click rate, conversion)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time email open, click, and bounce tracking with event collection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User activity, organization insights, and subscription analytics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Exportable reports and historical data analysis</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Additional Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Beyond core email marketing capabilities, the platform includes essential
        business management features:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">User & Organization Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Multi-tenant architecture with complete data isolation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Role-based access control (RBAC) with granular permissions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User management: employees, roles, and permission assignment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization settings and configuration management</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Subscriptions & Billing</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Flexible subscription plans (Free, Basic, Pro, Enterprise)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automated billing cycles and invoice generation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Usage tracking and plan limits enforcement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription management and upgrade/downgrade workflows</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these simple steps to begin your email marketing journey:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create an Account</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Sign up for an account using email or Google OAuth. Create your organization
              and configure basic settings. You'll be automatically assigned the Admin role
              and can start inviting team members.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Add Contacts</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Start by adding contacts to your database. Add contacts individually through
              the contact form, or upload them in bulk using CSV/Excel files. The system
              validates and processes imports asynchronously, handling duplicates and errors
              automatically.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create Email Templates</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Design your email templates using the rich HTML editor. Use dynamic variables
              like {"{{firstName}}"}, {"{{email}}"}, or custom fields for personalization.
              Organize templates with categories and tags, and preview before saving.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Build Your First Campaign</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Create a new campaign, select a contact list, and add multiple steps. Configure
              each step with a template, trigger type (immediate, delayed, or reply-based),
              and scheduling. Review and activate to start the automated email sequence.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Monitor Performance</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use the analytics dashboard to track campaign performance in real-time. Monitor
              delivery rates, open rates, click rates, bounces, and replies. Analyze trends,
              identify optimization opportunities, and export reports for deeper analysis.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The Email Campaign Tool is built on a modern, scalable architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Multi-Tenant Architecture</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Each organization operates in complete data isolation. All database queries
            automatically filter by organization ID, ensuring users can only access data
            belonging to their organization. SUPERADMIN role can bypass tenant filtering
            for system administration.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Role-Based Access Control (RBAC)</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Comprehensive RBAC system with fine-grained permission control. Permissions are
            defined at resource (Contacts, Campaigns, Templates) and action (Create, Read,
            Update, Delete) levels. Roles can be customized per organization, and permissions
            are checked dynamically on every API request.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Queue-Based Processing</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Heavy operations like email sending, bulk contact uploads, and campaign processing
            are handled asynchronously using BullMQ (Redis-based queue system). This ensures
            the application remains responsive, handles failures gracefully with retries, and
            scales horizontally with worker processes.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Gmail Integration</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Seamless integration with Gmail SMTP for reliable email delivery. The system handles
            OAuth authentication, manages email credentials securely, processes bounces and
            replies automatically, and tracks delivery status in real-time.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Audit Logging</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Comprehensive audit trail for all system activities. Every API request, data change,
            and user action is logged with timestamps, user information, and request details.
            Audit logs support compliance requirements and troubleshooting.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Next Steps</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Explore the detailed documentation for each feature:
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <a
          href="/documentation/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Learn about contact management and bulk upload
          </p>
        </a>
        <a
          href="/documentation/contact-lists"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contact Lists</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Organize your contacts into lists for better targeting
          </p>
        </a>
        <a
          href="/documentation/templates"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Email Templates</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Create beautiful, reusable email templates
          </p>
        </a>
        <a
          href="/documentation/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Build and manage multi-step email campaigns
          </p>
        </a>
      </div>
    </DocContent>
  );
}
