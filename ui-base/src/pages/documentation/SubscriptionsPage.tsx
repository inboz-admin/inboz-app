import { DocContent, DocCallout, DocStep, DocFeatureList } from "@/components/documentation/DocContent";

export default function SubscriptionsPage() {
  return (
    <DocContent>
      <p className="text-sm text-muted-foreground mb-8 font-normal leading-relaxed font-['Inter',sans-serif]">
        Subscriptions are the foundation of the Email Campaign Tool's pricing model, providing
        organizations with access to features and resources based on their chosen plan. Each
        subscription plan includes specific limits, features, and pricing that scale with your
        organization's needs. Understanding how subscriptions work helps you choose the right
        plan and manage your organization's usage effectively.
      </p>

      <DocCallout variant="tip" title="Key Benefits">
        Flexible per-user pricing with monthly and yearly billing options, automatic daily quota
        management and limit enforcement, feature-based access control, trial period for new
        organizations, easy plan upgrades and downgrades with prorated billing, automatic
        subscription renewal and expiry handling, comprehensive usage tracking and quota
        monitoring, and support tier differentiation across plans.
      </DocCallout>

      <h2 className="text-xl font-bold">Core Features</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The subscription system provides comprehensive capabilities for managing your organization's
        plan and usage:
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-6">
        <div className="space-y-3">
          <h3 className="text-base font-bold">Subscription Plans</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Four plan tiers: Free Trial, Starter, Pro, and Scale</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Per-user pricing model with monthly and yearly billing cycles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Yearly billing offers 2 months free (10 months paid)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Plan-specific features and access levels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Daily email sending limits based on plan tier</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Unlimited contacts, campaigns, templates, and users (no hard limits)</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Quota Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Daily email sending limits enforced per organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic quota reset at midnight IST (daily)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Real-time quota checking before email sending</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Cached quota data for performance optimization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Quota exceeded notifications and error handling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Usage tracking through analytics dashboard</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Billing and Payments</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monthly and yearly billing cycle options</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic subscription renewal at period end</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Prorated billing for plan upgrades and downgrades</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Invoice generation and PDF download</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Payment method management and updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription cancellation and expiry handling</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold">Plan Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Easy plan upgrades with immediate feature access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Plan downgrades scheduled for next billing cycle</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>User count adjustments with prorated billing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Billing cycle changes (monthly to yearly or vice versa)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Subscription status tracking (active, cancelled, expired, trial)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automatic trial expiry and conversion handling</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Subscription Plans</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Choose the plan that best fits your organization's needs:
      </p>

      <div className="my-6 space-y-6">
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-base font-bold mb-3">Free Trial</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-4">
            7-day free trial with Starter features and 30 emails per day. Perfect for testing
            the platform before committing to a paid plan.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Pricing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Monthly: $0 per user</li>
                <li>• Yearly: $0 per user</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Limits</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Daily emails: 30 per day</li>
                <li>• Contacts: Unlimited</li>
                <li>• Campaigns: Unlimited</li>
                <li>• Templates: Unlimited</li>
                <li>• Users: Unlimited</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Basic analytics and reporting</li>
                <li>• Email support</li>
                <li>• Campaign templates</li>
                <li>• Contact management</li>
                <li>• Basic reporting</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-base font-bold mb-3">Starter</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-4">
            Perfect for small teams getting started with email campaigns. Includes essential
            features for managing contacts and sending campaigns.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Pricing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Monthly: $29 per user/month</li>
                <li>• Yearly: $290 per user/year (save $58)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Limits</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Daily emails: 300 per day</li>
                <li>• Contacts: Unlimited</li>
                <li>• Campaigns: Unlimited</li>
                <li>• Templates: Unlimited</li>
                <li>• Users: Unlimited</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Basic analytics and reporting</li>
                <li>• Email support</li>
                <li>• Campaign templates</li>
                <li>• Contact management</li>
                <li>• Basic reporting</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-base font-bold mb-3">Pro</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-4">
            Advanced features for growing businesses. Includes advanced analytics, A/B testing,
            automation, and integrations.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Pricing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Monthly: $39 per user/month</li>
                <li>• Yearly: $390 per user/year (save $78)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Limits</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Daily emails: 600 per day</li>
                <li>• Contacts: Unlimited</li>
                <li>• Campaigns: Unlimited</li>
                <li>• Templates: Unlimited</li>
                <li>• Users: Unlimited</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Advanced analytics and reporting</li>
                <li>• Email support + Priority support</li>
                <li>• Campaign templates</li>
                <li>• Contact management</li>
                <li>• Advanced reporting</li>
                <li>• A/B testing</li>
                <li>• Automation</li>
                <li>• Integrations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-base font-bold mb-3">Scale</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-4">
            Enterprise-grade features for large teams. Includes all Pro features plus dedicated
            account manager, phone support, custom integrations, API access, and white-label options.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Pricing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Monthly: $49 per user/month</li>
                <li>• Yearly: $490 per user/year (save $98)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Limits</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Daily emails: 1,000 per day</li>
                <li>• Contacts: Unlimited</li>
                <li>• Campaigns: Unlimited</li>
                <li>• Templates: Unlimited</li>
                <li>• Users: Unlimited</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Advanced analytics and reporting</li>
                <li>• Email support + Priority support + Phone support</li>
                <li>• Dedicated account manager</li>
                <li>• Campaign templates</li>
                <li>• Contact management</li>
                <li>• Advanced reporting</li>
                <li>• A/B testing</li>
                <li>• Automation</li>
                <li>• Integrations + Custom integrations</li>
                <li>• API access</li>
                <li>• White-label options</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Follow these steps to understand and manage your subscription:
      </p>

      <div className="space-y-4 my-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Start with Free Trial</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              When you create a new organization, you automatically receive a 7-day Free Trial
              subscription. This gives you access to Starter plan features with a daily limit
              of 30 emails. Use this period to explore the platform, test features, and evaluate
              if the Email Campaign Tool meets your needs.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Monitor Your Usage</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Keep track of your daily email sending quota through the analytics dashboard. The
              system enforces daily limits based on your subscription plan. If you approach your
              limit, you'll receive notifications. Daily quotas reset automatically at midnight IST.
              Monitor your usage to ensure you stay within plan limits and avoid service interruptions.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Choose Your Plan</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Before your trial expires, choose a paid plan that matches your needs. Consider your
              daily email volume, team size, and required features. Starter is ideal for small teams,
              Pro adds advanced features for growing businesses, and Scale provides enterprise-grade
              capabilities. Use the pricing calculator to estimate costs based on your user count.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Subscribe to a Paid Plan</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Navigate to the Subscriptions page and select your desired plan. Choose between
              monthly or yearly billing (yearly offers 2 months free). Enter your payment method
              and complete the subscription. Your subscription will be activated immediately, and
              you'll gain access to all features and limits of your chosen plan. The system will
              handle prorated billing if upgrading from a trial or existing plan.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Manage Your Subscription</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Use the Subscriptions page to manage your subscription. You can upgrade to a higher
              plan at any time (changes take effect immediately with prorated billing), downgrade
              to a lower plan (changes apply at the next billing cycle), adjust user count (with
              prorated billing), change billing cycle (monthly to yearly or vice versa), view
              invoices and download PDFs, and update payment methods.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            6
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-2">Understand Plan Limits</h3>
            <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
              Each plan has a daily email sending limit that resets at midnight IST. There are no
              hard limits on contacts, campaigns, templates, or users—these are unlimited across
              all plans. The main constraint is the daily email quota. If you need to send more
              emails, consider upgrading to a plan with a higher daily limit. Monitor your usage
              through the analytics dashboard to ensure you stay within limits.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold">Understanding Limits and Quotas</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Understanding how limits work helps you manage your subscription effectively:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Daily Email Limits</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            Each subscription plan has a daily email sending limit that applies to your entire
            organization:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Free Trial:</strong> 30 emails per day</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Starter:</strong> 300 emails per day</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Pro:</strong> 600 emails per day</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Scale:</strong> 1,000 emails per day</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mt-3">
            Daily limits reset automatically at midnight IST (18:30 UTC). The system checks quotas
            before sending each email, and if the limit is exceeded, email sending will be blocked
            until the quota resets. This prevents accidental overages and ensures fair usage across
            all organizations.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Unlimited Resources</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mb-3">
            Unlike daily email limits, the following resources are unlimited across all plans:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Contacts:</strong> No limit on the number of contacts you can store</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Campaigns:</strong> Create as many campaigns as you need</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Templates:</strong> No limit on email templates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Users:</strong> Add as many team members as needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Contact Lists:</strong> Create unlimited contact lists for segmentation</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif] mt-3">
            This means you can grow your contact database, create multiple campaigns, and add team
            members without worrying about hitting resource limits. The only constraint is your
            daily email sending quota.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Quota Enforcement</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The system enforces daily email limits in real-time. When you attempt to send an email
            (through campaign activation or manual sending), the system checks if you have remaining
            quota for the day. If the quota is available, the email is sent and the quota is decremented.
            If the quota is exhausted, the email sending is blocked with an appropriate error message.
            Quota data is cached for performance, and the cache is cleared when quotas reset or when
            subscription changes occur.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Plan Features Comparison</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        Each plan includes different features and support levels:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Basic Features (All Plans)</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Campaign templates and email template management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Contact management and contact list organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Email campaign creation and scheduling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Multi-step campaign sequences</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Analytics and Reporting</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Free Trial & Starter:</strong> Basic analytics and reporting with key metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Pro & Scale:</strong> Advanced analytics with detailed insights, user-wise analytics,
              campaign performance tracking, and advanced reporting capabilities</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Support Levels</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Free Trial & Starter:</strong> Email support during business hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Pro:</strong> Email support + Priority support with faster response times</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Scale:</strong> Email support + Priority support + Phone support + Dedicated
              account manager for personalized assistance</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Advanced Features (Pro & Scale)</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>A/B testing for campaign optimization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Automation workflows for campaign sequences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Third-party integrations with popular tools</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Enterprise Features (Scale Only)</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Custom integrations tailored to your needs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>API access for programmatic access and automation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>White-label options for branding customization</span>
            </li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Architecture Overview</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        The subscription system is built on a flexible, scalable architecture:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Subscription Lifecycle</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Subscriptions progress through various states: Trial (7-day free trial period), Active
            (paid subscription with full access), Cancelled (subscription cancelled but remains active
            until period end), Expired (subscription period ended without renewal), and Pending
            (plan changes scheduled for next billing cycle). The system automatically handles state
            transitions, renewals, and expiries through scheduled tasks.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Quota Management System</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The QuotaManagementService handles all quota-related operations. It retrieves subscription
            information, calculates daily limits based on plan, checks remaining quota, and enforces
            limits before email sending. Quota data is cached in Redis for performance, with automatic
            cache invalidation when subscriptions change or quotas reset. Daily quotas reset at midnight
            IST through a scheduled cron job.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Billing and Proration</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            The system uses prorated billing for plan changes and user count adjustments. When you
            upgrade or downgrade, the system calculates the prorated amount based on remaining days
            in the billing period. Upgrades take effect immediately with a prorated charge, while
            downgrades are scheduled for the next billing cycle. The ProrationCalculationService
            handles all billing calculations to ensure accurate charges.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Automatic Renewal</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Active subscriptions automatically renew at the end of each billing period. The
            SubscriptionRenewalService runs scheduled tasks to check for subscriptions due for renewal,
            process payments, extend subscription periods, and handle any pending plan changes. Failed
            renewals are retried, and organizations are notified of payment issues.
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold">Trial Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            New organizations automatically receive a Free Trial subscription that expires after 7 days.
            The TrialManagementService tracks trial periods, sends expiration reminders, and handles
            trial-to-paid conversions. If a trial expires without conversion, the organization's
            subscription status changes, but data is preserved for a grace period.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold">Best Practices</h2>
      <p className="text-sm text-muted-foreground mb-6 font-['Inter',sans-serif]">
        To effectively manage your subscription:
      </p>

      <div className="my-6 space-y-5">
        <div>
          <h3 className="text-base font-bold">Plan Selection</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Start with Free Trial to evaluate the platform before committing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Choose a plan based on your daily email volume needs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Consider yearly billing to save 2 months of costs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Upgrade as your needs grow—you can always change plans</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Usage Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Monitor daily email usage through the analytics dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Plan campaign sends to stay within daily limits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Upgrade your plan if you consistently approach quota limits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use contact segmentation to send targeted campaigns efficiently</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Billing Management</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Keep payment methods up to date to avoid service interruptions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Review invoices regularly for accuracy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Download invoice PDFs for accounting and record-keeping</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Understand prorated billing when making plan changes</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Plan Optimization</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Regularly review your usage to ensure you're on the right plan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Upgrade when you need more daily email capacity</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Consider downgrading if you consistently use less than your quota</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Take advantage of advanced features when upgrading to Pro or Scale</span>
            </li>
          </ul>
        </div>
      </div>

      <DocCallout variant="info" title="Plan Flexibility">
        You can upgrade or downgrade your plan at any time. Upgrades take effect immediately with
        prorated billing, while downgrades apply at your next billing cycle. This flexibility allows
        you to adjust your subscription as your needs change without long-term commitments.
      </DocCallout>

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
            Understand how subscriptions are associated with organizations
          </p>
        </a>
        <a
          href="/docs/analytics"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Monitor your usage and quota consumption through analytics
          </p>
        </a>
        <a
          href="/docs/campaigns"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">Campaigns</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Learn how subscription limits affect campaign sending
          </p>
        </a>
        <a
          href="/docs/user-management"
          className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <h3 className="text-base font-bold mb-1">User Management</h3>
          <p className="text-sm text-muted-foreground font-['Inter',sans-serif]">
            Understand how user count affects subscription pricing
          </p>
        </a>
      </div>
    </DocContent>
  );
}
