import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Mail, AlertTriangle } from "lucide-react";

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
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground">Last updated: January 15, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Agreement to Terms */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground mb-4">
                These Terms govern your use of Inboz (the "Service"). By creating an account or using Inboz, you agree to these Terms. We reserve the right to modify the Terms at any time; material changes will be posted on our site or notified to you, and continued use of Inboz constitutes acceptance of the updated terms.
              </p>
            </CardContent>
          </Card>

          {/* Eligibility */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Eligibility</h2>
              <p className="text-muted-foreground mb-4">
                Inboz is intended for individuals who can form legally binding contracts. You must be at least the age of majority in your jurisdiction (usually 18 years or older) to use the Service. If you are under the age of 18, you may only use Inboz with parental or guardian involvement. By using Inboz, you represent that you meet these requirements and that you will comply with all Inboz policies and applicable laws.
              </p>
            </CardContent>
          </Card>

          {/* Account and Google Authorization */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Account and Google Authorization</h2>
              <p className="text-muted-foreground mb-4">
                You must link Inboz to a valid Google account to send emails. You agree that you are the rightful owner of that account and have the right to grant Inboz the requested permissions. You agree not to share your account or OAuth tokens with others. You are solely responsible for activity under your account.
              </p>
            </CardContent>
          </Card>

          {/* User Content and Responsibility */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">User Content and Responsibility</h2>
              <p className="text-muted-foreground mb-4">
                You are solely responsible for all content you send through Inboz. This includes the text and recipients of your email campaigns. You agree to use the Service only for lawful, legitimate purposes. You must comply with all applicable laws regarding electronic communications, including laws about privacy and unsolicited emails.
              </p>
              <p className="text-muted-foreground mb-4">
                For example, you must ensure your campaigns include proper unsubscribe instructions and valid physical address, as required by the U.S. CAN-SPAM Act and similar laws. You must not upload or send any content that is illegal, fraudulent, harassing, defamatory, or infringing on others' rights. Inboz does not screen your content before sending. If any dispute arises with a recipient or authority about your emails, you agree to indemnify and hold Inboz harmless from any resulting claims, damages or costs.
              </p>
            </CardContent>
          </Card>

          {/* Spam and Abuse */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Spam and Abuse</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Inboz strictly prohibits unsolicited bulk email (spam) and any abusive use of the Service. If you purchase or use email lists, you bear the risk if those addresses have not opted-in. You must promptly honor any opt-out (unsubscribe) requests from recipients.
              </p>
              <p className="text-muted-foreground mb-4">
                For example, compliance with CAN-SPAM requires that all commercial email have accurate header information, a valid physical address, and a clear unsubscribe method. Violation of anti-spam laws or our policies may result in suspension of your account. Inboz does not monitor outgoing emails, but Google may take action on Gmail accounts that appear to send spam: Google itself warns that "User accounts that send spam might be permanently restricted from sending email". Inboz is not responsible for such Gmail enforcement actions.
              </p>
            </CardContent>
          </Card>

          {/* Billing and Payments */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Billing and Payments</h2>
              <p className="text-muted-foreground mb-4">
                Inboz is a paid subscription service. You agree to pay the fees specified for the plan you select. Payments are processed securely via our payment provider (e.g. Stripe). Billing is in USD and will recur according to your subscription term.
              </p>
              <p className="text-muted-foreground mb-4">
                All fees are non-refundable: as one example terms state, "All service fees are non-refundable; no refunds or credits for partial months of this Subscription". You remain responsible for all charges incurred until your account is cancelled. If payment fails or subscription lapses, we may suspend your account until payment is received.
              </p>
            </CardContent>
          </Card>

          {/* Free Trial */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Free Trial (if offered)</h2>
              <p className="text-muted-foreground">
                If Inboz offers a free trial, you will not be charged during the trial period. After the trial, you will be automatically charged unless you cancel. You may cancel at any time during the trial to avoid charges. Once charged, the refund policy above applies.
              </p>
            </CardContent>
          </Card>

          {/* Suspension and Termination */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Suspension and Termination</h2>
              <p className="text-muted-foreground mb-4">
                We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason (including violations of these Terms). For example, one service's policy states: "We reserve the right to modify, suspend, or terminate your account … at any time with or without notice or refund".
              </p>
              <p className="text-muted-foreground">
                Upon cancellation (by you or us), your account and all your stored data will be deleted and cannot be recovered. You will remain responsible for all fees accrued through termination. If terminated, all rights granted to you here are revoked.
              </p>
            </CardContent>
          </Card>

          {/* No Warranty and Disclaimer */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">No Warranty and Disclaimer</h2>
              <p className="text-muted-foreground mb-4">
                THE SERVICE IS PROVIDED "AS-IS" AND "AS AVAILABLE." Inboz does not warrant that the service will be uninterrupted, error-free, or secure. To the maximum extent permitted by law, Inboz and its affiliates disclaim all warranties, express or implied, including warranties of merchantability or fitness for a particular purpose.
              </p>
              <p className="text-muted-foreground mb-4">
                You acknowledge that using an online service involves inherent risks. For example, as one policy notes, "no security system is impenetrable". Inboz does not guarantee that emails will be delivered or arrive on time, since delivery depends on Gmail's systems and your recipients' email providers. Inboz explicitly disclaims any liability for Gmail sending limits or failures. Inboz also does not guarantee the performance of any third-party integrations or services.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, INBOZ SHALL NOT BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA OR BUSINESS OPPORTUNITY) ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="text-muted-foreground mb-4">
                In particular, Inboz is not responsible for any issue caused by third-party systems: "We are not responsible for the transmission or reception of information by any Third Party Products. … If any changes in Service cause Third Party Products to become obsolete or affect their performance, you are responsible for addressing those issues". Similarly, "in no event shall we be liable for any damages related to any third party product or service" (for example, Gmail itself).
              </p>
              <p className="text-muted-foreground">
                Your sole remedy with respect to dissatisfaction is to stop using the Service and cancel your account.
              </p>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms and your use of the Service are governed by the laws of India. Disputes will be resolved in the courts of India. You agree to submit to the personal jurisdiction of the Indian courts for any claims.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms. Continued use after changes constitutes acceptance of the new terms. If you do not agree to updated terms, stop using Inboz and request account deletion.
              </p>
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
                    <strong>Support Email:</strong>{" "}
                    <a
                      href="mailto:support@inboz.io"
                      className="text-primary hover:underline"
                    >
                      support@inboz.io
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>Version 1.0 | Effective Date: January 15, 2026</p>
            <p className="mt-2">© 2026 Inboz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
