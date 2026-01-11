import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function ContactListsPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        Contact lists allow you to organize and segment your contacts for targeted email
        campaigns. Lists help you send the right message to the right audience at the right
        time. You can create manual lists by selecting contacts, or dynamic lists that
        automatically include contacts based on filter criteria.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Manual and dynamic list creation, flexible contact membership management, filter-based
        segmentation with JSON conditions, list types (Private, Public), automatic contact
        count tracking, list duplication and organization, campaign targeting with automatic
        unsubscribed contact exclusion, and list analytics for performance tracking.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Contact lists provide comprehensive capabilities for organizing and segmenting contacts:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">List Creation & Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Create lists with unique names per organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Add descriptions to document list purpose and usage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>List types: Private (user-specific) or Public (organization-wide)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Edit list name, description, and settings after creation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Duplicate lists for similar segments or variations</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Contact Membership</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Add contacts individually or in bulk to lists</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Remove contacts from lists without deleting the contact</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Many-to-many relationship: contacts can belong to multiple lists</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic contact count tracking and updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Track when contacts were added and by whom</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Dynamic Lists & Filtering</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Create dynamic lists with filter conditions stored as JSON</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Filter by subscription status, custom fields, date ranges, and more</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic list updates when contacts match filter criteria</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Combine multiple filter conditions with AND/OR logic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time contact count based on current filter matches</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Campaign Integration</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Select contact lists as campaign targets during campaign creation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic exclusion of unsubscribed contacts from campaign sends</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>List member count determines campaign recipient count</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Track campaign performance by list for segmentation insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use multiple lists for a single campaign to combine audiences</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to create and manage contact lists:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create a Contact List</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Navigate to the Contact Lists page and click "Create List". Enter a descriptive
              name (required, unique per organization), optional description, and choose the
              list type (Private or Public). Save to create the list.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Add Contacts to List</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Open the list details page and click "Add Contacts". Search for contacts, select
              individual contacts or multiple contacts at once, apply filters to find specific
              segments, and confirm to add them. Contacts can belong to multiple lists.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create Dynamic Lists</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              For automatic segmentation, create a dynamic list with filter conditions. Define
              criteria like subscription status, custom fields, date ranges, or contact source.
              The list automatically includes contacts matching the criteria and updates as
              contacts change.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Organize and Maintain Lists</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Regularly review list members, remove inactive or unengaged contacts, update
              list descriptions as purposes change, merge duplicate lists when appropriate, and
              archive old lists that are no longer used to keep your list library organized.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Use Lists in Campaigns</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              When creating a campaign, select one or more contact lists as the target audience.
              The system automatically excludes unsubscribed contacts. Review the list member
              count to estimate campaign reach, and track campaign performance by list to
              identify the most engaged segments.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The contact list system is built on a flexible, scalable architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Organization Isolation</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All contact lists belong to an organization and are automatically filtered by
            organizationId. The unique constraint ensures list names are unique per organization,
            allowing the same list name in different organizations. All queries automatically
            include organization filtering through BaseRepository.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Many-to-Many Relationship</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The ContactListMember entity creates a many-to-many relationship between contacts
            and lists. A contact can belong to multiple lists, and a list can contain multiple
            contacts. This junction table tracks membership with timestamps (addedAt) and user
            information (addedBy) for audit purposes.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Dynamic List Filtering</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Dynamic lists use filterConditions stored as JSON to define membership criteria.
            These conditions can include subscription status, custom fields, date ranges, contact
            source, and more. The system evaluates these conditions when querying list members,
            allowing for automatic segmentation without manual contact selection.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Contact Count Tracking</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The contactCount field is automatically maintained to track the number of contacts
            in each list. For manual lists, this is updated when contacts are added or removed.
            For dynamic lists, the count reflects contacts currently matching the filter
            conditions. This provides quick insights without querying all members.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Soft Delete Support</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Contact lists support soft deletes, meaning they can be marked as deleted without
            permanently removing data. This allows for data recovery, maintains referential
            integrity with related records (campaigns, contact list members), and preserves
            audit trails. Deleted lists are filtered out of normal queries but can be restored.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">List Type Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Lists can be Private (visible and manageable only by the creator) or Public
            (visible and manageable by all organization members). This allows for personal
            organization lists while also supporting shared organizational segments. The type
            is stored as an enum and can be changed after list creation.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To get the most value from contact lists:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">List Organization</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use clear, descriptive list names that indicate purpose and audience</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Add descriptions to document list purpose, criteria, and usage guidelines</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Organize lists by purpose, segment type, or campaign category</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep lists focused and specific rather than overly broad</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Segmentation Strategy</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Start with broad segments and refine over time based on engagement data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use dynamic lists for segments that change frequently based on contact behavior</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test different segmentation approaches and measure campaign performance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review and adjust segments based on analytics and feedback</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">List Maintenance</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review list members and remove inactive or unengaged contacts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Update dynamic list filter conditions as segmentation needs evolve</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Merge duplicate lists when appropriate to reduce list fragmentation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Archive old lists that are no longer used to keep your list library clean</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Campaign Targeting</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Choose lists that match your campaign's target audience and messaging</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Review list health and member count before sending campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test campaigns with smaller lists first before sending to larger audiences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Track campaign performance by list to identify the most engaged segments</span>
            </li>
          </ul>
        </div>
      </div>

      <DocCallout variant="info" title="List Limits">
        The number of lists you can create and their sizes may be limited by your subscription
        plan. Monitor your list count and member counts through the analytics dashboard to
        ensure you stay within plan limits.
      </DocCallout>

      <h2 className="text-xl font-bold">Related Documentation</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Learn more about related features:
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <a
          href="/docs/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Learn about contact management and adding contacts to lists
          </p>
        </a>
        <a
          href="/docs/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Use contact lists to target and segment your email campaigns
          </p>
        </a>
        <a
          href="/docs/templates"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Email Templates</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Create personalized templates for different list segments
          </p>
        </a>
        <a
          href="/docs/analytics"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Track list performance and campaign engagement by segment
          </p>
        </a>
      </div>
    </DocContent>
  );
}
