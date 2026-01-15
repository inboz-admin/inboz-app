import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function EmailTemplatesPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        Email templates are reusable email designs that form the foundation of your campaigns.
        They allow you to create professional, consistent emails while saving time and maintaining
        brand consistency. Templates support HTML and plain text formats, variable personalization,
        and can be organized with categories and tags for easy management.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Rich HTML and plain text email templates, dynamic variable substitution for personalization,
        template versioning and parent-child relationships, categories and tags for organization,
        template sharing (Private or Public), usage tracking and analytics, design settings stored
        as JSON, and compliance validation for email standards.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Email templates provide comprehensive capabilities for creating professional emails:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">Template Editor</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Rich HTML content editor with syntax highlighting and validation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Plain text content editor for text-only email versions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Live preview functionality for desktop and mobile views</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Variable picker for easy insertion of personalization variables</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Design settings stored as JSON for flexible styling configuration</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Variable Personalization</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Standard variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}, {"{{companyName}}"}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom field variables based on contact custom fields</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Variable substitution in subject lines and email content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic variable replacement when emails are sent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Variable list stored as JSON for template documentation</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Template Organization</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Categories for grouping templates (Newsletters, Promotional, Transactional, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Tags stored as JSON array for flexible cross-category organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Template types: Private (user-specific) or Public (organization-wide)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Search and filter templates by name, category, tags, or type</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Full-text search on template names for quick discovery</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Template Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Template versioning with version numbers and parent template relationships</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Usage tracking: usage count and last used timestamp</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Template duplication for creating variations or new versions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Send format selection: HTML, TEXT, or both for maximum compatibility</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Soft delete support for template recovery and audit trail preservation</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to create and manage email templates:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create a Template</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Navigate to the Email Templates page and click "Create Template". Enter a
              descriptive name (required, unique per organization), email subject line (can
              include variables), optional category, and tags. Choose template type (Private
              or Public) and send format (HTML, TEXT, or both).
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Design Your Template</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use the HTML editor to create rich email content with formatting, images, and
              links. Create a plain text version for recipients who prefer text-only emails.
              Use the variable picker to insert personalization variables like {"{{firstName}}"}
              or {"{{email}}"}. Preview your template on desktop and mobile before saving.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Configure Variables</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Define which variables your template uses. The system automatically detects
              variables in your content, but you can also manually specify them. Variables
              are stored as a JSON array and used for template documentation and validation.
              Test variable substitution using the preview feature.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Organize Templates</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Assign templates to categories (Newsletters, Promotional, Transactional, etc.)
              and add tags for cross-category organization. Use consistent naming conventions
              and organize by purpose or campaign type. Mark templates as Public to share
              with your organization or keep them Private for personal use.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Use Templates in Campaigns</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              When creating campaign steps, select a template for each step. Variables are
              automatically populated from contact data when emails are sent. You can use
              different templates for different steps in a campaign sequence. Templates can
              be reused across multiple campaigns, and usage is tracked automatically.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The email template system is built on a flexible, scalable architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization Isolation</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All email templates belong to an organization and are automatically filtered by
            organizationId. The unique constraint ensures template names are unique per
            organization (considering soft deletes), allowing the same template name in
            different organizations. All queries automatically include organization filtering
            through BaseRepository.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Template Versioning</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Templates support versioning with a version number and optional parent template
            relationship. This allows you to track template evolution, create variations from
            existing templates, and maintain a history of changes. The parent template ID
            creates a relationship tree for template families.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Variable System</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Variables are stored as a JSON array in the template entity. The system uses
            double curly brace syntax ({"{{variableName}}"}) for variable placeholders. When
            emails are sent, the email sending service automatically replaces these variables
            with actual contact data from the contact record, supporting both standard fields
            and custom fields.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Content Storage</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Templates store both HTML content (LONGTEXT) and plain text content (LONGTEXT)
            separately. This allows for rich HTML emails while maintaining text-only fallbacks
            for maximum email client compatibility. The sendFormat field determines which
            version is sent (HTML, TEXT, or both).
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Usage Tracking</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The system automatically tracks template usage with usageCount (number of times
            used in campaigns) and lastUsedAt (timestamp of last usage). This data helps
            identify popular templates, unused templates that can be archived, and template
            performance for optimization decisions.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Template Access Control</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Templates can be Private (visible only to the creator) or Public (visible to all
            organization members). The type field combined with createdBy allows for flexible
            access control. Private templates are filtered by creator, while Public templates
            are accessible to all users in the organization for collaboration and brand
            consistency.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To maximize the value of your email templates:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Template Design</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Design for mobile-first viewing with responsive HTML and CSS</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use clear, readable fonts (sans-serif recommended) and maintain sufficient contrast</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep content width under 600px for best email client compatibility</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test templates in multiple email clients and devices before use</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use inline styles when needed for better email client compatibility</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Variable Usage</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use variables strategically for personalization without overdoing it</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test variable substitution in preview mode before using in campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Document which variables each template uses for team reference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Ensure contact data is available for all variables used in templates</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Template Organization</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use consistent naming conventions that indicate template purpose</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organize with categories and tags for easy discovery and management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Mark brand-consistent templates as Public for team collaboration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review and archive unused templates to keep library organized</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Template Maintenance</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Update templates to reflect brand changes and keep designs current</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor template usage statistics to identify popular and unused templates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use versioning and parent templates to track template evolution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test templates after system updates to ensure compatibility</span>
            </li>
          </ul>
        </div>
      </div>

      <DocCallout variant="info" title="Template Limits">
        The number of templates you can create may be limited by your subscription plan.
        Monitor your template count through the analytics dashboard to ensure you stay within
        plan limits. The system will prevent creating new templates when limits are exceeded.
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
            Use templates in email campaigns and multi-step sequences
          </p>
        </a>
        <a
          href="/documentation/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand contact data and custom fields for template variables
          </p>
        </a>
        <a
          href="/documentation/contact-lists"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contact Lists</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Create templates for different list segments and audiences
          </p>
        </a>
        <a
          href="/documentation/analytics"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Track template performance and engagement metrics
          </p>
        </a>
      </div>
    </DocContent>
  );
}
