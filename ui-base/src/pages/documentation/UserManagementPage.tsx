import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function UserManagementPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        User management is a core feature that allows organizations to control access, assign
        roles, and manage team members within the Email Campaign Tool. Each user belongs to
        an organization and has specific roles and permissions that determine what they can
        access and modify in the system.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Email-based authentication with password or OAuth (Google) login, role-based access
        control with granular permissions, user invitation system with email onboarding,
        profile management with avatar and settings, activity tracking and last login
        monitoring, and status management (active, inactive, suspended).
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        User management provides comprehensive capabilities for managing your team:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">User Accounts</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email-based authentication with unique email addresses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Password-based login or OAuth (Google) sign-in</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Profile information: first name, last name, avatar URL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organization association with automatic context filtering</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom settings stored as JSON for flexible configuration</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Role-Based Access Control</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Predefined roles: Owner, Admin, Member, Viewer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Granular permissions at resource and action levels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic permission checking on all API requests</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Server-side enforcement preventing permission bypass</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom roles can be created with specific permission combinations</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">User Status Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Active: User can access the platform normally</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Inactive: User account is temporarily disabled</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Suspended: User access has been suspended by admin</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Last login tracking for security monitoring</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">User Invitations</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email-based invitation system for onboarding new users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Role assignment during invitation process</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic organization association upon acceptance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Invitation tracking and status management</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to manage users in your organization:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">User Registration</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              New users can sign up directly through the registration process, which creates
              their account and automatically associates them with an organization. Users can
              choose password-based authentication or OAuth (Google) sign-in.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Invite Team Members</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Organization owners and admins can invite users by email. Navigate to the Users
              page, click "Invite User", enter the email address, and select the appropriate
              role. The invited user receives an email with a link to complete registration.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Assign Roles</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Assign appropriate roles to users based on their responsibilities. Owner has
              full control, Admin can manage users and settings, Member can create campaigns,
              and Viewer has read-only access. Roles can be updated at any time.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Manage User Status</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Monitor and manage user statuses. Set users to Active for normal access, Inactive
              to temporarily disable accounts, or Suspended for security purposes. Track last
              login times to identify inactive accounts.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Review Permissions</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Regularly review user permissions and roles to ensure they align with current
              responsibilities. Remove access for users who no longer need it, and update
              permissions as team members' roles change.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The user management system is built on secure, role-based architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization Association</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Every user belongs to exactly one organization, stored in the organizationId field.
            This association is used for automatic data filtering, ensuring users can only
            access data belonging to their organization. The organization context is retrieved
            via UserContextService and used throughout the application.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Authentication Methods</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Users can authenticate using password-based login (with hashed passwords stored
            securely) or OAuth providers like Google. OAuth users have their social provider
            and social ID stored for account linking. Both authentication methods create the
            same user account structure with organization association.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Permission System</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Permissions are defined at the resource (Contacts, Campaigns, Templates) and action
            (CREATE, READ, UPDATE, DELETE) level. Roles are collections of these permissions.
            The PermissionsGuard automatically checks permissions on API endpoints using
            @RequirePermission decorators, enforcing security at the server level.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Soft Delete Support</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Users support soft deletes, meaning accounts can be marked as deleted without
            permanently removing data. This allows for data recovery, maintains referential
            integrity with related records, and preserves audit trails. Deleted users are
            filtered out of normal queries but can be restored if needed.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Audit Trail</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All user changes are automatically logged with audit fields (createdBy, updatedBy,
            deletedBy) and timestamps. The system tracks last login times, user activity, and
            all modifications for security monitoring, compliance, and troubleshooting purposes.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To effectively manage users in your organization:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Role Assignment</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Follow the principle of least privilege: assign minimum necessary permissions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use role-based access control to enforce security consistently</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review and update user roles as responsibilities change</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Remove access immediately for users who leave the organization</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">User Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep user information up to date, especially email addresses and names</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Deactivate accounts for users who leave or are on extended leave</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor user activity through last login times and audit logs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use the invitation system for secure onboarding of new team members</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Security</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Encourage strong passwords or OAuth authentication for better security</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor for suspicious activity through audit logs and login tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep user roles aligned with current responsibilities and job functions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review and update user access to maintain security posture</span>
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
          href="/docs/organizations"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Organizations</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Learn about organization management and multi-tenant architecture
          </p>
        </a>
        <a
          href="/docs/system"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">System</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand audit logs and security monitoring features
          </p>
        </a>
        <a
          href="/docs/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            See how permissions affect campaign management and access
          </p>
        </a>
        <a
          href="/docs/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand how user permissions control contact management access
          </p>
        </a>
      </div>
    </DocContent>
  );
}
