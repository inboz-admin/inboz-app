import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Mail } from "lucide-react";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 py-12 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: January 2, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Section 1 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">1. AGREEMENT TO TERMS</h2>
              <p className="text-muted-foreground mb-4">
                By accessing and using the Email Campaign Tool ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to any part of these Terms, you are not permitted to use the Service.
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Key Points:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>These Terms form a legally binding agreement between you and Inboz</li>
                  <li>By signing up, clicking "I Accept," or using the Service, you consent to these Terms</li>
                  <li>We reserve the right to modify these Terms at any time by posting updates on our website</li>
                  <li>Continued use of the Service after modifications constitutes your acceptance of the revised Terms</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">2. SERVICE DEFINITION & SCOPE</h2>
              <p className="text-muted-foreground mb-4">
                The Email Campaign Tool is a software-as-a-service (SaaS) platform that enables users to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                <li>Create and manage email contact lists</li>
                <li>Design email templates with dynamic content and variables</li>
                <li>Schedule and send email campaigns</li>
                <li>Track email delivery, opens, clicks, bounces, and replies</li>
                <li>Analyze campaign performance through comprehensive dashboards</li>
                <li>Manage organizational users and roles</li>
              </ul>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>What is NOT Included:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email delivery service itself (we integrate with Gmail SMTP)</li>
                  <li>Support for third-party email providers beyond Gmail</li>
                  <li>Storage or processing of email message content from your inbox</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">3. USER ACCOUNTS & ACCESS RIGHTS</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Account Creation:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You must provide accurate, complete, and current information during registration</li>
                    <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                    <li>You must immediately notify us of any unauthorized access or suspected security breaches</li>
                    <li>You are liable for all activities occurring under your account</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Organization-Based Access:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>The first user signing up with a company email domain becomes the organization admin</li>
                    <li>Admins can invite additional users and assign roles (Admin, Manager, User, Analyst)</li>
                    <li>Each role has specific permissions for features and data access</li>
                    <li>You are responsible for revoking access for terminated employees within 24 hours</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Authorized Users:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Only you and your explicitly authorized team members ("Authorized Users") may access the Service</li>
                    <li>You may not share account credentials or allow unauthorized third parties to use your account</li>
                    <li>Each user seat is non-transferable and tied to one individual</li>
                    <li>You may not circumvent user seat limits or create multiple accounts to bypass restrictions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">4. PAYMENT & BILLING</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Subscription Tiers:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Starter Tier: 100 emails/day, basic templates, 30-day analytics retention</li>
                    <li>Professional Tier: 500 emails/day, advanced features, A/B testing, 90-day retention</li>
                    <li>Business Tier: 2,000 emails/day, custom templates, API access, 365-day retention</li>
                    <li>Enterprise Tier: 10,000 emails/day, white-label, priority support, unlimited retention</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Payment Terms:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>All fees are specified in your Order Form and are non-refundable</li>
                    <li>Subscription automatically renews unless you provide written notice 30 days before expiry</li>
                    <li>You authorize us to charge your payment method for all applicable fees</li>
                    <li>Late payments bear interest at the lesser of 1.5% per month or the maximum allowed by law</li>
                    <li>You are responsible for all applicable taxes unless you provide a valid tax exemption certificate</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Credit System:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email sending credits are consumable units with specified expiration dates</li>
                    <li>Credits expire at the end of your billing cycle and do not roll over</li>
                    <li>Unused credits cannot be refunded or transferred to future periods</li>
                    <li>You cannot resell, transfer, or exchange credits</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Cancellation:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Subscriptions are non-cancelable during the active term</li>
                    <li>You may cancel upon the end of your current billing period by providing 30 days' written notice</li>
                    <li>Upon cancellation, access to the Service terminates immediately</li>
                    <li>Your data may be deleted 90 days after cancellation unless otherwise required by law</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">5. USAGE RESTRICTIONS & PROHIBITED ACTIVITIES</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">You Agree NOT to:</p>
                  <p className="font-semibold mb-2 mt-4">General Prohibitions:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Use the Service for any illegal, fraudulent, or deceptive purpose</li>
                    <li>Violate any email marketing laws (CAN-SPAM, CASL, GDPR, etc.)</li>
                    <li>Send unsolicited emails, spam, or harassing communications</li>
                    <li>Engage in phishing, malware distribution, or other malicious activities</li>
                    <li>Impersonate any person or organization</li>
                    <li>Claim ownership of or reverse-engineer our proprietary algorithms and technology</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Technical Restrictions:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Access the Service using bots, scrapers, or automated tools without authorization</li>
                    <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
                    <li>Attempt to circumvent rate limits, usage caps, or other technical restrictions</li>
                    <li>Create derivative works or incorporate the Service into competing products</li>
                    <li>Disable, interfere with, or circumvent any security or access control measures</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Email Sending Restrictions:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Send emails from distribution addresses (hello@, marketing@, noreply@)</li>
                    <li>Exceed Gmail SMTP daily sending limits or engage in quota circumvention</li>
                    <li>Use misleading subject lines or sender information</li>
                    <li>Send emails to purchased, rented, or third-party lists without proper consent</li>
                    <li>Fail to include valid unsubscribe mechanisms in all emails</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">6. INTELLECTUAL PROPERTY & OWNERSHIP</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Our Intellectual Property:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>All Platform features, design, functionality, and source code are owned by Inboz</li>
                    <li>Contact Database, analytics, and curated data are our exclusive property</li>
                    <li>Trademarks and logos cannot be used without our written permission</li>
                    <li>Your feedback and suggestions regarding the Service become our exclusive property</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Your Content:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You retain ownership of your Contact Lists and Customer Data</li>
                    <li>You grant us a non-exclusive license to process and store your data to provide the Service</li>
                    <li>We may use anonymized, aggregated data to improve our Service and Contact Database</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 7 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">7. WARRANTY DISCLAIMER & LIMITATIONS OF LIABILITY</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Disclaimer:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>The Service is provided "AS IS" and "AS AVAILABLE"</li>
                    <li>We disclaim all warranties, express or implied, including merchantability and fitness for purpose</li>
                    <li>We do not warrant that the Service will be error-free, secure, or uninterrupted</li>
                    <li>Email deliverability and inbox placement depend on Gmail SMTP, recipient ISPs, and your practices</li>
                    <li>Contact Database data is compiled from multiple sources and may contain inaccuracies</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Limitation of Liability:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
                    <li>Our total liability shall not exceed the fees you paid in the 12 months preceding the claim</li>
                    <li>We are not liable for third-party services, integrations, or actions of Gmail/ISPs</li>
                    <li>Some jurisdictions do not allow limitation of liability; this may not apply to you</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 8 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">8. TERMINATION & SUSPENSION</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Termination by You:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You may terminate your account at any time by requesting account deletion</li>
                    <li>We will delete your data within 90 days unless legally required to retain it</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Termination by Us:</p>
                  <p className="mb-2">We may terminate or suspend your account immediately if:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You violate these Terms or applicable laws</li>
                    <li>You engage in fraudulent or abusive behavior</li>
                    <li>You fail to pay fees within 30 days of invoice</li>
                    <li>You create security risks or harm other users</li>
                    <li>You attempt to circumvent restrictions or security measures</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 9 */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">9. DISPUTE RESOLUTION</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Governing Law:</p>
                  <p className="ml-4">These Terms are governed by the laws of the jurisdiction where Inboz operates, excluding conflict of law principles.</p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Dispute Resolution Process:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Good faith negotiation between the parties</li>
                    <li>Mediation through a mutually agreed mediator (if negotiation fails)</li>
                    <li>Binding arbitration in the jurisdiction where Inboz operates (if mediation fails)</li>
                    <li>Either party may pursue injunctive relief for IP infringement or breach of confidentiality</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card className="border border-border bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Mail className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Questions About These Terms?</h3>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Email:</strong> legal@inboz.io<br />
                    <strong>Support:</strong> support@inboz.io
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>Version 1.0 | Effective Date: January 2, 2026</p>
            <p className="mt-2">© 2026 Inboz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

