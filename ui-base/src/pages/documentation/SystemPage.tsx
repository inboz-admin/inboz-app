import { DocContent, DocCallout, DocFeatureList } from "@/components/documentation/DocContent";

export default function SystemPage() {
  return (
    <DocContent>
      <p>
        The System section provides access to audit logs and system administration
        features, helping you maintain security, compliance, and operational visibility.
      </p>

      <h2>Audit Logs Overview</h2>
      <p>
        Audit logs provide a comprehensive record of all actions performed in the system,
        ensuring transparency, security, and compliance.
      </p>

      <DocFeatureList
        items={[
          "Complete action history",
          "User activity tracking",
          "Resource change tracking",
          "Security event logging",
          "Compliance documentation",
          "Searchable log database",
        ]}
      />

      <h2>Audit Log Features</h2>
      <p>
        The audit logging system captures detailed information about system activities:
      </p>

      <h3>Logged Actions</h3>
      <p>
        The system logs various types of actions:
      </p>

      <h4>Resource Operations</h4>
      <ul>
        <li>
          <strong>CREATE:</strong> When resources are created
        </li>
        <li>
          <strong>READ:</strong> When resources are accessed (for sensitive data)
        </li>
        <li>
          <strong>UPDATE:</strong> When resources are modified
        </li>
        <li>
          <strong>DELETE:</strong> When resources are deleted
        </li>
        <li>
          <strong>RESTORE:</strong> When soft-deleted resources are restored
        </li>
      </ul>

      <h4>Authentication Events</h4>
      <ul>
        <li>User login attempts</li>
        <li>Successful logins</li>
        <li>Failed login attempts</li>
        <li>Logout events</li>
        <li>Password changes</li>
        <li>OAuth authentication</li>
      </ul>

      <h4>Authorization Events</h4>
      <ul>
        <li>Permission checks</li>
        <li>Access denials</li>
        <li>Role changes</li>
        <li>Permission modifications</li>
      </ul>

      <h4>System Events</h4>
      <ul>
        <li>Campaign activations</li>
        <li>Email sending events</li>
        <li>Bulk operations</li>
        <li>System configuration changes</li>
      </ul>

      <h3>Audit Log Information</h3>
      <p>
        Each audit log entry contains detailed information:
      </p>

      <h4>Basic Information</h4>
      <ul>
        <li>
          <strong>Timestamp:</strong> When the action occurred
        </li>
        <li>
          <strong>User:</strong> Who performed the action
        </li>
        <li>
          <strong>Action:</strong> What action was performed
        </li>
        <li>
          <strong>Resource:</strong> What resource was affected
        </li>
        <li>
          <strong>Resource ID:</strong> Identifier of the affected resource
        </li>
      </ul>

      <h4>Additional Details</h4>
      <ul>
        <li>
          <strong>IP Address:</strong> Source IP of the request
        </li>
        <li>
          <strong>User Agent:</strong> Browser or client information
        </li>
        <li>
          <strong>Request ID:</strong> Unique request identifier
        </li>
        <li>
          <strong>Changes:</strong> What changed (for updates)
        </li>
        <li>
          <strong>Metadata:</strong> Additional context information
        </li>
      </ul>

      <h3>Viewing Audit Logs</h3>
      <p>
        Access and review audit logs:
      </p>

      <DocStep number={1} title="Navigate to Audit Logs">
        Go to the Audit Logs page from the System section in navigation.
      </DocStep>

      <DocStep number={2} title="Filter Logs">
        Use filters to find specific logs:
        <ul>
          <li>Filter by user</li>
          <li>Filter by action type</li>
          <li>Filter by resource</li>
          <li>Filter by date range</li>
          <li>Search by keywords</li>
        </ul>
      </DocStep>

      <DocStep number={3} title="View Log Details">
        Click on a log entry to view detailed information about the action, including
        what changed and who performed it.
      </DocStep>

      <DocStep number={4} title="Export Logs">
        Export audit logs for external analysis or compliance reporting.
      </DocStep>

      <h3>Audit Log Search</h3>
      <p>
        Powerful search capabilities help you find specific events:
      </p>
      <ul>
        <li>Full-text search across log entries</li>
        <li>Advanced filtering options</li>
        <li>Date range selection</li>
        <li>User-specific filtering</li>
        <li>Resource-specific filtering</li>
      </ul>

      <h2>System Administration</h2>
      <p>
        System administration features help manage platform operations:
      </p>

      <h3>Platform Management</h3>
      <p>
        Platform employees (SUPERADMIN) have access to:
      </p>
      <ul>
        <li>Organization management</li>
        <li>User administration</li>
        <li>System configuration</li>
        <li>Platform-wide analytics</li>
        <li>Support tools</li>
      </ul>

      <h3>Organization Administration</h3>
      <p>
        Platform administrators can:
      </p>
      <ul>
        <li>View all organizations</li>
        <li>Manage organization settings</li>
        <li>Handle support requests</li>
        <li>Monitor system-wide usage</li>
        <li>Perform administrative actions</li>
      </ul>

      <h3>User Administration</h3>
      <p>
        System administrators can manage:
      </p>
      <ul>
        <li>Platform employees</li>
        <li>User accounts across organizations</li>
        <li>Role assignments</li>
        <li>Access permissions</li>
        <li>Account status</li>
      </ul>

      <h2>Security and Compliance</h2>
      <p>
        The system includes features to maintain security and compliance:
      </p>

      <h3>Security Features</h3>
      <DocFeatureList
        items={[
          "Comprehensive audit logging",
          "Role-based access control",
          "Secure authentication",
          "Data encryption",
          "IP tracking",
          "Session management",
        ]}
      />

      <h3>Compliance Support</h3>
      <p>
        Audit logs support compliance requirements:
      </p>
      <ul>
        <li>
          <strong>Data Protection:</strong> Track data access and modifications
        </li>
        <li>
          <strong>Regulatory Compliance:</strong> Maintain records for audits
        </li>
        <li>
          <strong>Security Audits:</strong> Review security events and incidents
        </li>
        <li>
          <strong>Forensics:</strong> Investigate security issues
        </li>
      </ul>

      <h3>Data Retention</h3>
      <p>
        Audit logs are retained according to system policies:
      </p>
      <ul>
        <li>Logs are stored securely</li>
        <li>Retention periods may vary by log type</li>
        <li>Important logs may be retained longer</li>
        <li>Export logs for long-term storage if needed</li>
      </ul>

      <DocCallout variant="info" title="Audit Log Retention">
        Audit logs are retained for compliance and security purposes. Export important
        logs if you need to maintain records beyond the system retention period.
      </DocCallout>

      <h2>Best Practices</h2>
      <p>
        To effectively use system administration features:
      </p>

      <h3>Audit Log Review</h3>
      <ul>
        <li>Regularly review audit logs for security</li>
        <li>Monitor for suspicious activity</li>
        <li>Investigate unusual patterns</li>
        <li>Use logs for troubleshooting</li>
      </ul>

      <h3>Security Monitoring</h3>
      <ul>
        <li>Set up alerts for critical events</li>
        <li>Monitor authentication events</li>
        <li>Review access patterns</li>
        <li>Track permission changes</li>
      </ul>

      <h3>Compliance Management</h3>
      <ul>
        <li>Export logs for compliance reporting</li>
        <li>Maintain audit trail documentation</li>
        <li>Review logs before audits</li>
        <li>Ensure log integrity and security</li>
      </ul>

      <h3>Administrative Practices</h3>
      <ul>
        <li>Use administrative access responsibly</li>
        <li>Document administrative actions</li>
        <li>Follow security best practices</li>
        <li>Regularly review administrative access</li>
      </ul>

      <h2>Related Documentation</h2>
      <ul>
        <li>
          <a href="/docs/user-management">User Management</a> - Learn about users and
          permissions
        </li>
        <li>
          <a href="/docs/organizations">Organizations</a> - Understand organization
          management
        </li>
        <li>
          <a href="/docs/analytics">Analytics</a> - View system-wide analytics
        </li>
      </ul>
    </DocContent>
  );
}

