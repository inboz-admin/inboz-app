import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function OrganizationsPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        Organizations are the foundation of the multi-tenant architecture in the Email
        Campaign Tool. Each organization operates in complete data isolation, with its own
        contacts, campaigns, templates, users, and settings. This ensures that every tenant's
        data remains secure and separate from other organizations.
      </p>

      <DocCallout variant="tip" title="Key Benefits">
        Complete data isolation, automatic organization-based filtering, flexible user
        management with role-based access control, customizable settings and configuration,
        usage quotas and limits based on subscription plans, and comprehensive audit logging
        for compliance and security.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Organizations provide a comprehensive set of features for managing your tenant:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">Multi-Tenant Architecture</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Complete data isolation between organizations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic organization-based filtering on all queries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Repository-level enforcement preventing cross-tenant access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>SUPERADMIN role can bypass filtering for system administration</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Organization Settings</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Basic information: name, slug, domain, timezone, description</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Contact details: address, phone, email, website, logo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email sending preferences and notification settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom configuration via JSON settings field</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">User Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Multiple users per organization with different roles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Role-based access control: Owner, Admin, Member, Viewer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User invitation system with email-based onboarding</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User activity tracking and management capabilities</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Data Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Isolated contacts, contact lists, and segmentation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization-specific email templates and campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Usage quotas and limits based on subscription plan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Comprehensive audit logs for all organization activities</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to set up and manage your organization:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create Your Organization</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              When you sign up, an organization is automatically created. You become the Owner
              and can configure basic settings like name, slug, timezone, and contact information.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Configure Settings</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Set up your organization's timezone for accurate campaign scheduling, configure
              email sending preferences, customize notification settings, and add your branding
              information (logo, website, contact details).
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Invite Team Members</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Invite users to join your organization by email. Assign appropriate roles (Admin,
              Member, Viewer) based on their responsibilities. Each user will receive an
              invitation email to complete their registration.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Manage Permissions</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use role-based access control to manage user permissions. Assign roles that match
              each user's responsibilities, and regularly review permissions to ensure security
              and proper access levels.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Monitor Usage</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Monitor your organization's usage quotas including email sending limits, contact
              storage, campaign counts, and user limits. Track usage through the analytics
              dashboard to avoid hitting plan limits.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The organization system is built on a robust multi-tenant architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Data Isolation</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All database queries automatically include organization-based filtering through the
            BaseRepository class. This ensures users can only access data belonging to their
            organization. The filtering is enforced at the repository level, making it impossible
            to bypass through direct model queries.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Organization Context</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Every user belongs to exactly one organization, determined from their user account.
            The organization context is automatically retrieved via UserContextService and used
            for filtering queries, setting audit fields (createdBy, updatedBy), enforcing
            subscription limits, and managing permissions.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Soft Delete Support</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Organizations support soft deletes, meaning they can be marked as deleted without
            permanently removing data. This allows for data recovery and maintains referential
            integrity. Deleted organizations are filtered out of normal queries but can be
            restored if needed.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Audit Trail</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All organization changes are automatically logged with audit fields (createdBy,
            updatedBy, deletedBy) and timestamps. The system maintains a comprehensive audit
            trail for compliance, security monitoring, and troubleshooting purposes.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Settings Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Organization settings are stored as JSON, allowing flexible configuration without
            schema changes. Common settings include email preferences, notification configurations,
            default campaign settings, and custom branding options. Settings can be updated
            dynamically without affecting the core organization structure.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To effectively manage your organization:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization Setup</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Choose a clear, descriptive organization name that represents your brand</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Set a unique slug that's URL-friendly and memorable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Configure the correct timezone for accurate campaign scheduling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Add complete contact information for billing and support purposes</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">User Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Assign roles based on responsibilities: Owner for full control, Admin for
              management, Member for campaign creation, Viewer for read-only access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review user permissions and remove inactive users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use the principle of least privilege: grant minimum necessary permissions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor user activity through audit logs for security purposes</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Data Security</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Trust the automatic organization filtering—never bypass it unless SUPERADMIN</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review audit logs to detect unauthorized access attempts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep organization settings secure and limit access to sensitive configuration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor usage quotas to prevent unexpected service interruptions</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Related Documentation</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Learn more about related features:
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <a
          href="/documentation/user-management"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">User Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Learn about users, roles, and permissions within organizations
          </p>
        </a>
        <a
          href="/documentation/system"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">System</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand audit logs and system administration features
          </p>
        </a>
        <a
          href="/documentation/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Manage contacts within your organization's isolated data
          </p>
        </a>
        <a
          href="/documentation/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Create and manage campaigns within your organization
          </p>
        </a>
      </div>
    </DocContent>
  );
}
