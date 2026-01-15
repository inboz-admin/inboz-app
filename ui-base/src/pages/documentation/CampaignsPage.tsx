import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function CampaignsPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        Campaigns are the core of your email marketing efforts, enabling sophisticated multi-step
        email sequences that engage your audience and drive results. Campaigns support multiple
        trigger types, intelligent scheduling, engagement-based flows, quota management, and
        comprehensive tracking. Each campaign consists of ordered steps that send emails based on
        time delays, schedules, or recipient engagement.
      </p>

      <DocCallout variant="tip" title="Key Capabilities">
        Multi-step email sequences with flexible trigger types (IMMEDIATE, SCHEDULE), engagement-based
        triggers (OPENED, CLICKED), intelligent quota distribution across days, automatic contact
        exclusion (bounced/unsubscribed), real-time progress tracking, campaign status management
        (DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED), step-level analytics, and compliance validation.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Campaigns provide comprehensive capabilities for creating sophisticated email sequences:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">Multi-Step Sequences</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Create unlimited steps per campaign with ordered sequence execution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Each step can use a different email template and trigger configuration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Steps execute automatically based on trigger conditions and delays</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Support for adding new steps to active campaigns dynamically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Step-level analytics: sent, delivered, opened, clicked, bounced, unsubscribed</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Trigger Types</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>IMMEDIATE: Send immediately or after delay from previous step completion</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>SCHEDULE: Send at specific date and time (respects timezone settings)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Engagement triggers: OPENED (when previous email opened) or CLICKED (when link clicked)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Delay minutes between emails within a step (supports decimals, e.g., 0.5 = 30 seconds)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Reply-to-step relationships for engagement-based sequences</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Quota Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic quota distribution across days to respect daily/monthly limits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Quota-aware scheduling: emails spread across available quota days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign pauses automatically when quota limits are reached</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Quota validation before campaign activation prevents over-sending</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time quota monitoring and usage tracking</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Contact Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic exclusion of bounced contacts from all subsequent steps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic exclusion of unsubscribed contacts from all subsequent steps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Only subscribed contacts receive emails (respects contact subscription status)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Contact list targeting: campaigns target specific contact lists</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Consistent contact ordering for predictable scheduling</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to create and activate email campaigns:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Create Campaign</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Navigate to the Campaigns page and click "Create Campaign". Enter a descriptive
              name (required), optional description, and select a target contact list. The contact
              list must have subscribed contacts for the campaign to activate. Configure tracking
              settings (open tracking, click tracking, unsubscribe tracking) as needed.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Add Campaign Steps</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Add one or more steps to your campaign. Each step represents an email that will be
              sent. Configure step name, select an email template, choose trigger type (IMMEDIATE
              or SCHEDULE), set delay minutes (time between emails within the step), and optionally
              configure engagement triggers (replyToStepId and replyType for OPENED/CLICKED).
              Steps are executed in order based on stepOrder.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Configure Step Triggers</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              For IMMEDIATE steps, set delayMinutes (e.g., 0.5 = 30 seconds, 60 = 1 hour) to
              control spacing between emails. For SCHEDULE steps, set scheduleTime to a specific
              date and time. For engagement-based steps, set replyToStepId to reference a previous
              step and replyType to OPENED or CLICKED. The system will send the step only when
              the engagement condition is met.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Review and Validate</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Review your campaign configuration. The system validates that the campaign has at
              least one step, all steps have email templates assigned, the contact list has
              subscribed contacts, and quota is available. Check step order, trigger configurations,
              and template assignments. Ensure all required fields are completed before activation.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Activate Campaign</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Click "Activate" to start the campaign. The system validates requirements, checks
              quota availability, calculates quota distribution across days, schedules emails
              for all steps, and queues step processing jobs. IMMEDIATE steps start processing
              immediately, while SCHEDULE steps are queued for their scheduled times. The campaign
              status changes to ACTIVE and emails begin sending according to step configurations.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Campaign Flows and Scenarios</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Understanding how campaigns execute in different scenarios:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Scenario 1: Simple Immediate Sequence</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            A three-step welcome sequence with time-based delays:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong>Step 1 (IMMEDIATE, delayMinutes: 0):</strong> Welcome email sent immediately when campaign activates. All subscribed contacts receive email with 0.5 minute delay between each email.</li>
              <li><strong>Step 2 (IMMEDIATE, delayMinutes: 1440):</strong> Follow-up email sent 24 hours (1440 minutes) after Step 1 completes. Delay is calculated from when Step 1 finished sending to all contacts.</li>
              <li><strong>Step 3 (IMMEDIATE, delayMinutes: 2880):</strong> Final email sent 48 hours (2880 minutes) after Step 2 completes.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3 font-['Inter',sans-serif]">
              <strong>Flow:</strong> Campaign activates → Step 1 queues immediately → Step 1 sends to all contacts (spread across quota days) → Step 2 queues when Step 1 completes → Step 2 sends → Step 3 queues when Step 2 completes → Step 3 sends → Campaign completes.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">Scenario 2: Scheduled Campaign</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            A product launch campaign with specific send times:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong>Step 1 (SCHEDULE, scheduleTime: 2024-01-15 09:00):</strong> Launch announcement sent at 9:00 AM on January 15th.</li>
              <li><strong>Step 2 (SCHEDULE, scheduleTime: 2024-01-15 14:00):</strong> Reminder email sent at 2:00 PM same day.</li>
              <li><strong>Step 3 (SCHEDULE, scheduleTime: 2024-01-16 09:00):</strong> Follow-up sent at 9:00 AM next day.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3 font-['Inter',sans-serif]">
              <strong>Flow:</strong> Campaign activates → All steps queued with scheduled delays → Step 1 job processes at 9:00 AM → Step 2 job processes at 2:00 PM → Step 3 job processes next day at 9:00 AM → Campaign completes. Each step sends to all contacts with delayMinutes spacing.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">Scenario 3: Engagement-Based Sequence</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            A re-engagement campaign triggered by recipient actions:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong>Step 1 (IMMEDIATE, delayMinutes: 0):</strong> Initial email sent to all contacts immediately.</li>
              <li><strong>Step 2 (IMMEDIATE, replyToStepId: Step 1, replyType: OPENED, delayMinutes: 60):</strong> Sent only to contacts who opened Step 1, 1 hour after they opened it.</li>
              <li><strong>Step 3 (IMMEDIATE, replyToStepId: Step 2, replyType: CLICKED, delayMinutes: 30):</strong> Sent only to contacts who clicked a link in Step 2, 30 minutes after they clicked.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3 font-['Inter',sans-serif]">
              <strong>Flow:</strong> Campaign activates → Step 1 sends to all contacts → System tracks opens/clicks → When contact opens Step 1, Step 2 queues for that contact (1 hour delay) → When contact clicks Step 2, Step 3 queues for that contact (30 min delay) → Each contact follows their own path based on engagement.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">Scenario 4: Mixed Trigger Campaign</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            A complex campaign combining immediate, scheduled, and engagement triggers:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong>Step 1 (IMMEDIATE, delayMinutes: 0):</strong> Welcome email sent immediately.</li>
              <li><strong>Step 2 (SCHEDULE, scheduleTime: +3 days 10:00):</strong> Educational content sent 3 days later at 10:00 AM.</li>
              <li><strong>Step 3 (IMMEDIATE, replyToStepId: Step 2, replyType: OPENED, delayMinutes: 1440):</strong> Follow-up sent 24 hours after contact opens Step 2.</li>
              <li><strong>Step 4 (SCHEDULE, scheduleTime: +7 days 09:00):</strong> Final reminder sent 7 days after campaign start at 9:00 AM.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3 font-['Inter',sans-serif]">
              <strong>Flow:</strong> Campaign activates → Step 1 sends immediately → Step 2 scheduled for 3 days later → Step 3 waits for Step 2 opens → Step 4 scheduled for 7 days later. Contacts who don't open Step 2 skip Step 3 but still receive Step 4.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">Scenario 5: Quota-Aware Large Campaign</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            A campaign with 10,000 contacts and daily quota of 1,000 emails:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
              <strong>Quota Distribution:</strong> The system calculates that 10,000 emails need to be spread across 10 days (1,000 per day). Emails are scheduled across days 0-9, with each day receiving 1,000 emails.
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong>Day 0:</strong> First 1,000 contacts receive Step 1 emails starting from campaign activation time, spaced by delayMinutes.</li>
              <li><strong>Day 1:</strong> Next 1,000 contacts receive Step 1 emails starting at 12:01 AM (or after Day 0's last email + delay).</li>
              <li><strong>Days 2-9:</strong> Remaining contacts receive Step 1 emails, 1,000 per day.</li>
              <li><strong>Step 2:</strong> Begins sending 24 hours after Step 1 completes, following the same quota distribution pattern.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3 font-['Inter',sans-serif]">
              <strong>Flow:</strong> Campaign activates → Quota distribution calculated (10 days) → Step 1 emails scheduled across 10 days → Each day sends 1,000 emails respecting delayMinutes → Step 2 begins after Step 1 completes → Campaign continues until all steps complete.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">Scenario 6: Contact Exclusion Flow</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            How bounced and unsubscribed contacts are handled:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong>Step 1:</strong> Sends to 1,000 subscribed contacts. 50 emails bounce, 10 contacts unsubscribe.</li>
              <li><strong>Step 2:</strong> System automatically excludes the 50 bounced contacts and 10 unsubscribed contacts. Only 940 contacts receive Step 2.</li>
              <li><strong>Step 3:</strong> If 5 more contacts unsubscribe in Step 2, only 935 contacts receive Step 3.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3 font-['Inter',sans-serif]">
              <strong>Flow:</strong> Step 1 sends → Bounces and unsubscribes tracked → Step 2 excludes all previously bounced/unsubscribed contacts → Step 3 excludes all contacts who bounced/unsubscribed in any previous step → Campaign continues with clean contact list.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The campaign system is built on a robust, scalable architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Campaign Entity Structure</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Campaigns store basic information (name, description, contactListId), status
            (DRAFT, ACTIVE, PAUSED, CANCELLED, COMPLETED), sequence settings (JSON for quota
            distribution, configuration), current step and total steps tracking, and tracking
            preferences (open tracking, click tracking, unsubscribe tracking). All campaigns
            belong to an organization and support soft deletes.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Campaign Step Entity</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Steps store stepOrder (sequence position), name, templateId (email template reference),
            triggerType (IMMEDIATE or SCHEDULE), scheduleTime (for SCHEDULE triggers), delayMinutes
            (time between emails within step, supports decimals), replyToStepId and replyType
            (for engagement triggers), and step-level analytics (emailsSent, emailsDelivered,
            emailsOpened, emailsClicked, emailsBounced, unsubscribes). Steps belong to a campaign
            and organization.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Scheduling Algorithm</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The unified scheduling algorithm calculates email send times by: (1) Getting all
            subscribed contacts (excluding bounced/unsubscribed), (2) Calculating quota distribution
            across days, (3) For each contact, finding which day the email belongs to, (4) Calculating
            base time for that day (current time for immediate, schedule time for scheduled, or
            continuation from previous emails), (5) Adding within-day delay (emailIndexWithinDay ×
            delayMinutes), (6) Setting scheduledSendAt. This ensures quota compliance and predictable
            scheduling.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Queue-Based Processing</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Campaign processing uses BullMQ queues for asynchronous job execution. Campaign activation
            queues step processing jobs: IMMEDIATE steps queue immediately, SCHEDULE steps queue with
            calculated delays. The CampaignProcessorQueue handles step processing jobs, which create
            EmailMessage records and queue individual email sending jobs. This architecture ensures
            scalability, reliability, and non-blocking campaign execution.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Email Message Tracking</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Each email sent creates an EmailMessage record tracking: contactId, campaignId,
            campaignStepId, status (PENDING, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, FAILED,
            CANCELLED), scheduledSendAt, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt,
            unsubscribedAt. This enables comprehensive tracking, analytics, and engagement-based
            trigger evaluation.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Engagement Trigger Evaluation</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            For steps with replyToStepId and replyType, the system monitors EmailMessage records
            for the referenced step. When a contact opens (replyType: OPENED) or clicks (replyType:
            CLICKED) the referenced step's email, a job is queued to send the engagement-triggered
            step to that specific contact after the configured delayMinutes. This enables
            personalized, behavior-driven email sequences.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Campaign Status Lifecycle</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Understanding campaign status transitions and their implications:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">DRAFT Status</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Campaign is being created or edited. No emails are sent. You can add/remove steps,
            modify configurations, and make any changes. Campaign must be in DRAFT status to
            activate. All validation occurs during activation.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">ACTIVE Status</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Campaign is currently sending emails. Steps are processing, emails are being sent,
            and the campaign is progressing through its sequence. You can pause the campaign,
            add new steps (which will queue for processing), but cannot modify existing steps
            that have already sent emails. Campaign automatically transitions to COMPLETED when
            all steps finish.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">PAUSED Status</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Campaign is temporarily stopped. No new emails are sent, but scheduled emails remain
            in queue. You can resume the campaign to continue sending, or cancel it to stop
            permanently. Paused campaigns can be resumed to continue from where they left off.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">COMPLETED Status</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            All campaign steps have finished sending. Campaign automatically transitions to
            COMPLETED when the last step completes. No further emails are sent. You can view
            analytics and results, but cannot modify or reactivate the campaign. Create a new
            campaign if you need to send similar emails again.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">CANCELLED Status</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Campaign was cancelled before completion. No further emails are sent. Cancelled
            campaigns cannot be resumed or reactivated. Use this status to permanently stop
            a campaign that is no longer needed.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To create effective email campaigns:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Campaign Planning</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Define clear campaign goals and target audience before creating</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Plan step sequence, timing, and trigger types based on campaign objectives</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Choose appropriate contact lists that match your campaign goals</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test campaigns with small contact groups before full deployment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Consider quota limits when planning large campaigns</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Step Configuration</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep step sequences logical and progressive (welcome → education → conversion)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use appropriate delays between steps (24-48 hours for most campaigns)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Set delayMinutes appropriately (0.5-1 minute for small lists, longer for large lists)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use engagement triggers strategically to re-engage interested contacts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Ensure templates match step purpose and campaign goals</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Timing and Scheduling</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Consider recipient timezones when scheduling campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Send at optimal times for your audience (typically 9-11 AM or 2-4 PM)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Space out steps appropriately to avoid overwhelming recipients</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Avoid sending too frequently (minimum 24 hours between steps recommended)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use scheduled triggers for time-sensitive campaigns (product launches, events)</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Monitoring and Optimization</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor campaign performance regularly through analytics dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Analyze step-level metrics to identify high-performing and low-performing steps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Track open rates, click rates, and engagement to optimize future campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor bounce rates and unsubscribe rates to maintain list health</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use A/B testing with different templates or timing to improve results</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Compliance and Best Practices</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Respect unsubscribe requests immediately (system handles this automatically)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Follow email marketing best practices (CAN-SPAM, GDPR compliance)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Maintain sender reputation by monitoring bounce rates and list hygiene</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Clean contact lists regularly to remove invalid or bounced emails</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Provide clear unsubscribe options and honor them promptly</span>
            </li>
          </ul>
        </div>
      </div>

      <DocCallout variant="info" title="Campaign Limits">
        Campaigns are subject to quota limits based on your subscription plan. Monitor your
        quota usage through the analytics dashboard to ensure campaigns can complete successfully.
        The system automatically pauses campaigns when quota limits are reached, and you can
        resume them when quota becomes available.
      </DocCallout>

      <h2 className="text-xl font-bold">Related Documentation</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Learn more about related features:
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <a
          href="/documentation/contacts"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contacts</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Manage your contact database and subscription status
          </p>
        </a>
        <a
          href="/documentation/contact-lists"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Contact Lists</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Organize contacts into lists for campaign targeting
          </p>
        </a>
        <a
          href="/documentation/templates"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Email Templates</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Create email designs and templates for campaign steps
          </p>
        </a>
        <a
          href="/documentation/analytics"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Track campaign performance, engagement, and results
          </p>
        </a>
      </div>
    </DocContent>
  );
}
