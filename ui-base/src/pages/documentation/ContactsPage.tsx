import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function ContactsPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        Contacts are the foundation of your email marketing efforts. The Contacts feature
        allows you to manage your email list, track subscription status, organize contacts
        with custom fields, and perform bulk operations. Each contact belongs to your
        organization and is automatically isolated from other organizations' data.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Centralized contact database with custom fields, bulk contact upload via CSV/Excel
        with validation, subscription status management (subscribed, unsubscribed, bounced,
        complained), advanced search and filtering capabilities, contact list organization
        and segmentation, bounce and complaint tracking, and automatic unsubscribe handling
        for compliance.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Contact management provides comprehensive capabilities for managing your email list:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">Contact Database</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Centralized database with unique email addresses per organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Standard fields: email, first name, last name, company, job title, phone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom fields stored as JSON for flexible data storage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Contact source tracking (imported, manual, API, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Encrypted personal notes for sensitive information</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Bulk Operations</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Bulk contact upload via CSV/Excel files with column mapping</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Asynchronous processing for large imports with progress tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Duplicate detection and validation during import</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Bulk status updates (subscribe/unsubscribe multiple contacts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Error handling and reporting for failed imports</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Subscription Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription status: Active, Unsubscribed, Bounced, Complained, Inactive</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic unsubscribe handling from email links</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Bounce and complaint tracking with counters</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription timestamps (subscribedAt, unsubscribedAt)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic exclusion of unsubscribed contacts from campaigns</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Search & Filtering</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Full-text search across email, name, company, and custom fields</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Filter by subscription status, date range, source, and custom fields</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Advanced filtering with multiple criteria and AND/OR logic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Filter by contact list membership and campaign engagement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time search results with pagination support</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to manage contacts in your organization:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create Contacts Manually</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Navigate to the Contacts page and click "Add Contact". Enter the contact's email
              address (required), first name, last name, and any additional information like
              company, job title, or phone. Set the subscription status and save.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Bulk Upload Contacts</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Prepare a CSV or Excel file with contact information (email required, other
              fields optional). Click "Bulk Upload" or "Import Contacts", select your file,
              and map columns to contact fields. Review the preview and confirm import. Large
              imports are processed asynchronously.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Manage Subscription Status</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Monitor and manage contact subscription statuses. Update individual contacts or
              perform bulk updates. The system automatically handles unsubscribes from email
              links and excludes unsubscribed contacts from campaigns to ensure compliance.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Organize Contacts</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Add contacts to contact lists for better segmentation and targeting. Use custom
              fields to store additional information relevant to your business. Apply tags or
              categories to organize contacts by industry, location, engagement level, or
              customer segment.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Search and Filter</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use the search functionality to find contacts by email, name, or any field.
              Apply filters by subscription status, date range, custom fields, or contact list
              membership. Use advanced search to combine multiple criteria for precise contact
              selection.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The contact management system is built on a robust, scalable architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization Isolation</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All contacts belong to an organization and are automatically filtered by
            organizationId. The unique constraint ensures email addresses are unique per
            organization, allowing the same email to exist in different organizations.
            All queries automatically include organization filtering through BaseRepository.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Contact Status Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Contacts have multiple status fields: status (ACTIVE, UNSUBSCRIBED, BOUNCED,
            COMPLAINED, INACTIVE) and subscribed (boolean). The system tracks subscription
            timestamps, bounce counts, and complaint counts. Unsubscribed contacts are
            automatically excluded from campaign sends to ensure compliance.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Bulk Import Processing</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Large bulk imports are processed asynchronously using BullMQ queue system. The
            import process validates data, detects duplicates, maps columns, and handles
            errors gracefully. Progress is tracked and notifications are sent upon completion.
            This ensures the application remains responsive during large imports.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Custom Fields Storage</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Custom fields are stored as JSON, providing flexibility without schema changes.
            This allows organizations to store any additional contact information relevant
            to their business needs. Custom fields can be used in search, filtering, and
            email template personalization.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Soft Delete Support</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Contacts support soft deletes, meaning they can be marked as deleted without
            permanently removing data. This allows for data recovery, maintains referential
            integrity with related records (campaigns, contact lists), and preserves audit
            trails. Deleted contacts are filtered out of normal queries but can be restored.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Engagement Tracking</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The system tracks contact engagement with timestamps for last email sent, opened,
            and clicked. This data is used for analytics, segmentation, and campaign
            optimization. Bounce and complaint counts help identify problematic contacts and
            maintain list health.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To maintain a healthy and effective contact database:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Data Quality</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly clean your contact list and remove invalid or bounced email addresses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Validate email addresses during import and update contact information regularly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use consistent formatting for names, companies, and other fields</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor bounce and complaint counts to identify problematic contacts</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Subscription Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Respect unsubscribe requests immediately and maintain clear opt-in processes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review subscription statuses and document consent for compliance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor bounce rates and remove hard-bounced contacts to maintain sender reputation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Handle complaints promptly and investigate the root cause</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Organization & Segmentation</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use contact lists for segmentation and targeted campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Apply consistent tagging strategies and keep custom fields relevant and useful</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organize contacts by industry, location, engagement level, or customer segment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly audit and clean your database to maintain data quality</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Bulk Import</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Validate data before uploading and use consistent formatting across all records</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Check for duplicate emails in your file before import to avoid errors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Review import results for errors and handle validation failures appropriately</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor import progress for large files and wait for completion notifications</span>
            </li>
          </ul>
        </div>
      </div>

      <DocCallout variant="info" title="Contact Limits">
        Contact storage limits may vary based on your subscription plan. Monitor your
        contact count through the analytics dashboard to ensure you stay within plan limits.
        The system will prevent adding contacts when limits are exceeded.
      </DocCallout>

      <h2 className="text-xl font-bold">Related Documentation</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Learn more about related features:
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <a
          href="/documentation/contact-lists"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contact Lists</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Organize contacts into lists for better segmentation and targeting
          </p>
        </a>
        <a
          href="/documentation/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Use contacts in email campaigns and track engagement
          </p>
        </a>
        <a
          href="/documentation/templates"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Email Templates</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Personalize email templates using contact fields and custom data
          </p>
        </a>
        <a
          href="/documentation/analytics"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Track contact engagement and campaign performance metrics
          </p>
        </a>
      </div>
    </DocContent>
  );
}
