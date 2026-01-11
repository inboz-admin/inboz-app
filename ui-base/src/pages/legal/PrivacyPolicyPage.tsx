import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Mail, Shield, Lock } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: January 2, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">1. INTRODUCTION & DATA CONTROLLER</h2>
              <p className="text-muted-foreground mb-4">
                This Privacy Policy explains how we collect, use, process, and protect your personal data when you use the Email Campaign Tool.
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Organization Information:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Data Controller:</strong> Inboz</li>
                  <li><strong>Contact:</strong> privacy@inboz.io</li>
                  <li><strong>Support:</strong> support@inboz.io</li>
                </ul>
                <p className="mt-4"><strong>Our Commitment:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>We comply with GDPR, CCPA, CASL, and other applicable privacy laws</li>
                  <li>Your privacy and data security are our top priorities</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* What Data We Collect */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">2. WHAT DATA WE COLLECT</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Account & Registration Data:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Name, email address, company name, job title</li>
                    <li>Phone number, physical address, timezone</li>
                    <li>Account preferences and notification settings</li>
                    <li>Organization domain and membership information</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Usage & Performance Data:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Login history and access patterns</li>
                    <li>Feature usage statistics and interaction data</li>
                    <li>Device information (IP address, browser, OS)</li>
                    <li>System performance and error logs</li>
                    <li>Campaign creation and sending activity</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Contact & Campaign Data (Customer Data):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Contact lists you upload or create (names, emails, phone numbers)</li>
                    <li>Custom fields and contact attributes you define</li>
                    <li>Email templates you create</li>
                    <li>Campaign content and configurations</li>
                    <li>Email engagement events (opens, clicks, bounces, replies)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Payment & Billing Data:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Billing address and payment method information</li>
                    <li>Invoice history and transaction details</li>
                    <li>Subscription tier and feature usage</li>
                    <li>Tax exemption certificates (if provided)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Data We Do NOT Collect:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email message content from your inbox</li>
                    <li>Medical, financial, or highly sensitive data</li>
                    <li>Data of children under 16 years old</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lawful Basis */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">3. LAWFUL BASIS FOR PROCESSING</h2>
              <p className="text-muted-foreground mb-4">
                We process your personal data only when we have a lawful basis under GDPR Article 6:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-3 text-left">Data Type</th>
                      <th className="border border-border p-3 text-left">Lawful Basis</th>
                      <th className="border border-border p-3 text-left">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="border border-border p-3">Account Information</td>
                      <td className="border border-border p-3">Contract; Consent</td>
                      <td className="border border-border p-3">Create account, provide Service, billing</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Usage Data</td>
                      <td className="border border-border p-3">Legitimate Interest</td>
                      <td className="border border-border p-3">Improve Service, security, analytics</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Contact Data</td>
                      <td className="border border-border p-3">Contract; You provide it</td>
                      <td className="border border-border p-3">Enable email campaign functionality</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Payment Data</td>
                      <td className="border border-border p-3">Contract; Legal Obligation</td>
                      <td className="border border-border p-3">Process payments, tax compliance</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Support Data</td>
                      <td className="border border-border p-3">Contract; Legitimate Interest</td>
                      <td className="border border-border p-3">Provide customer support</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Marketing Data</td>
                      <td className="border border-border p-3">Consent</td>
                      <td className="border border-border p-3">Send promotional emails (optional)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Data */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">4. HOW WE USE YOUR DATA</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Primary Uses:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li><strong>Service Delivery:</strong> Creating accounts, processing campaigns, tracking engagement, analytics</li>
                    <li><strong>Billing & Payments:</strong> Processing subscriptions, invoicing, payment collection</li>
                    <li><strong>Customer Support:</strong> Responding to inquiries, resolving issues, providing assistance</li>
                    <li><strong>Security & Compliance:</strong> Detecting fraud, enforcing Terms, meeting legal obligations</li>
                    <li><strong>Service Improvement:</strong> Analytics, user research, feature development, performance optimization</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-2">Communication:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>We send transactional emails (account confirmations, password resets, invoice notices)</li>
                    <li>We may send platform updates and security alerts</li>
                    <li>We send product announcements (you can opt-out in account settings)</li>
                    <li>You can unsubscribe from non-critical emails at any time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">5. DATA SHARING & DISCLOSURE</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">We Share Data With:</p>
                  <p className="font-semibold mb-2 mt-4">Service Providers (Processors):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Gmail/Google (for email delivery via OAuth)</li>
                    <li>Cloud hosting providers (AWS, Azure)</li>
                    <li>Payment processors (Stripe, PayPal)</li>
                    <li>Email tracking and analytics providers</li>
                    <li>Customer support platforms</li>
                    <li>All providers sign Data Processing Agreements ensuring GDPR compliance</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Legal Compliance:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Government agencies when required by law or valid legal process</li>
                    <li>Law enforcement to prevent illegal activity or protect safety</li>
                    <li>Courts or regulators in response to court orders</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">We Do NOT:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Sell your personal data to third parties</li>
                    <li>Rent or lease your contact lists</li>
                    <li>Share data with competitors or unrelated businesses</li>
                    <li>Make data available to the public</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">6. DATA RETENTION & DELETION</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Retention Periods:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border p-3 text-left">Data Type</th>
                          <th className="border border-border p-3 text-left">Retention Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border p-3">Account Data</td>
                          <td className="border border-border p-3">Duration of account + 90 days after deletion</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Usage/Analytics Data</td>
                          <td className="border border-border p-3">12 months (aggregated after 6 months)</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Contact/Campaign Data</td>
                          <td className="border border-border p-3">Until you delete or account is terminated</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Payment/Billing Data</td>
                          <td className="border border-border p-3">7 years (legal/tax requirement)</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Support Tickets</td>
                          <td className="border border-border p-3">2 years or longer if legally required</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Email Event Logs</td>
                          <td className="border border-border p-3">90 days (based on subscription tier)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">Your Rights to Data:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Request access to all personal data we hold about you</li>
                    <li>Request correction of inaccurate or incomplete information</li>
                    <li>Request deletion of your data ("right to be forgotten")</li>
                    <li>Request data portability (export in structured format)</li>
                    <li>Withdraw consent for optional processing (cookies, marketing emails)</li>
                    <li>Object to processing for legitimate interest purposes</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">How to Exercise Rights:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email: privacy@inboz.io</li>
                    <li>Include proof of identity (we'll verify before processing)</li>
                    <li>We'll respond within 30 days (extendable to 60 days for complex requests)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <Shield className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">7. SECURITY & DATA PROTECTION</h2>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Technical Measures:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>AES-256 encryption for data at rest</li>
                    <li>TLS 1.3 encryption for data in transit</li>
                    <li>Secure password hashing (bcrypt)</li>
                    <li>Regular security audits and vulnerability assessments</li>
                    <li>Web Application Firewall (WAF) and DDoS protection</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Administrative Safeguards:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Limited employee access on need-to-know basis</li>
                    <li>Employee confidentiality and data protection training</li>
                    <li>Background checks for employees with data access</li>
                    <li>Documented incident response procedures</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Operational Practices:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Regular backups with point-in-time recovery</li>
                    <li>Secure database encryption and access controls</li>
                    <li>Monitoring for suspicious activity and unauthorized access</li>
                    <li>24/7 security monitoring and alerting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">8. COOKIES & TRACKING TECHNOLOGIES</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Cookies We Use:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border p-3 text-left">Cookie Type</th>
                          <th className="border border-border p-3 text-left">Purpose</th>
                          <th className="border border-border p-3 text-left">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border p-3">Session Cookies</td>
                          <td className="border border-border p-3">Maintain login state, CSRF protection</td>
                          <td className="border border-border p-3">During session</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Authentication Tokens</td>
                          <td className="border border-border p-3">Verify identity and organization context</td>
                          <td className="border border-border p-3">15 min - 7 days</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Preference Cookies</td>
                          <td className="border border-border p-3">Store language, timezone, dashboard settings</td>
                          <td className="border border-border p-3">1 year</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-3">Analytics Cookies</td>
                          <td className="border border-border p-3">Track feature usage and performance</td>
                          <td className="border border-border p-3">12 months</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">Your Cookie Choices:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Most browsers allow you to refuse cookies or alert you when cookies are sent</li>
                    <li>Disabling cookies may prevent some features from functioning properly</li>
                    <li>You can clear cookies from your browser settings</li>
                    <li>We provide cookie management options in your account settings</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Rights */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">9. YOUR PRIVACY RIGHTS (EU/UK/CALIFORNIA RESIDENTS)</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">European Union (GDPR):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Right of access: Obtain a copy of your personal data</li>
                    <li>Right to rectification: Correct inaccurate information</li>
                    <li>Right to erasure: Delete your data ("right to be forgotten")</li>
                    <li>Right to restrict processing: Limit how we use your data</li>
                    <li>Right to data portability: Export your data in machine-readable format</li>
                    <li>Right to object: Oppose processing for legitimate interests</li>
                    <li>Right to withdraw consent: Withdraw permission for optional processing</li>
                    <li>Right to lodge a complaint: File a complaint with your local data protection authority</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">California (CCPA):</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Right to know: Request what data we collect and how it's used</li>
                    <li>Right to delete: Request deletion of your personal data</li>
                    <li>Right to opt-out: Decline the sale/sharing of your personal information</li>
                    <li>Right to non-discrimination: We don't discriminate against you for exercising rights</li>
                    <li>Right to correct: Request correction of inaccurate data</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">How to Exercise Rights:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email: privacy@inboz.io</li>
                    <li>Verification: We'll verify your identity before processing</li>
                    <li>Timeline: 30 days (may extend to 60 for complex requests)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Policy Updates */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">10. POLICY UPDATES & CONTACT INFORMATION</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Changes to This Policy:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>We may update this Privacy Policy as our Service evolves</li>
                    <li>Significant changes will be announced at least 30 days in advance</li>
                    <li>Your continued use constitutes acceptance of changes</li>
                    <li>We'll notify you via email for material changes affecting your rights</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Contact Us:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>General Inquiries:</strong> support@inboz.io</li>
                    <li><strong>Privacy Inquiries:</strong> privacy@inboz.io</li>
                    <li><strong>Data Protection Officer:</strong> dpo@inboz.io</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card className="border border-border bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Lock className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Questions About Privacy?</h3>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Privacy Email:</strong> privacy@inboz.io<br />
                    <strong>Support Email:</strong> support@inboz.io<br />
                    <strong>DPO Email:</strong> dpo@inboz.io
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

