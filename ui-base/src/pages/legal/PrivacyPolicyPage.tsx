import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Shield, Lock } from "lucide-react";

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
          <p className="text-muted-foreground">Last Updated: January 15, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Inboz ("we", "our", "us") is committed to protecting your privacy in compliance with the EU GDPR, Indian IT and privacy laws (including the new Digital Personal Data Protection Act, 2023), and Google API Services requirements. We only collect the data needed to operate the Inboz email campaign service, and we do not sell or rent personal information. Our Privacy Policy fully documents how Inboz accesses, uses, stores, and shares Google user data and other personal information.
              </p>
              <p className="text-muted-foreground">
                Inboz is registered and headquartered in Bangalore, India, and this policy is governed by Indian law; any disputes will be subject to Indian courts.
              </p>
            </CardContent>
          </Card>

          {/* Information Collected */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Information Collected</h2>
              <p className="text-muted-foreground mb-4">
                We collect the following categories of data:
              </p>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <p className="font-semibold mb-2">Google Account Data:</p>
                  <p className="mb-2">
                    When you connect Inboz to your Google account via OAuth, we request only the scopes needed for the service: OpenID profile and email (to identify you), and Gmail API scopes (gmail.send to send mail and gmail.readonly to track mail). For example, the Gmail API scope gmail.send grants the ability to send messages only (no read/modify), and gmail.readonly grants read-only access to messages and metadata. We use this data solely to deliver the Inboz service (e.g. send your campaign emails via Gmail) and do not access any other Google data.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-2">User-Provided Data:</p>
                  <p className="mb-2">
                    You may upload contact lists and campaign content (recipients' email addresses, names, and your message templates) to Inboz. This data is stored securely and used only to send your campaigns. We treat you as the data controller for your contacts, and we act as a data processor following your instructions.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Email Interaction Data:</p>
                  <p className="mb-2">
                    To provide reporting, Inboz tracks campaign performance (e.g. email opens and link clicks). This tracking typically involves small, invisible images or link redirects. We collect non-identifying information from recipients (timestamp, IP range, link clicked) to report engagement to you. We do not use this data for any purposes other than providing analytics to the campaign owner, and we do not share it with third parties.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Usage and Device Data:</p>
                  <p className="mb-2">
                    We automatically collect technical data such as IP addresses, browser/OS type, device identifiers, log files and usage statistics when you use our service. We use this to maintain and improve the service, ensure security, and for analytics. This may include Google Analytics data. Google Analytics relies on first-party cookies (set by our site) to collect anonymized usage data. You may refuse cookies in your browser, but disabling cookies may prevent some features from working properly.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-2">Cookies and Similar Technologies:</p>
                  <p className="mb-2">
                    We use cookies and local storage to remember your session and preferences. Like many sites, Inboz uses HTTP cookies: "a small file containing a string of characters" sent by your browser to remember you and your settings. For example, cookies keep you logged in and store language or display preferences. We also use Google Analytics (a third-party service) to aggregate anonymous usage data; Google Analytics relies on cookies to track page views and events. You can control or delete cookies in your browser settings, but note that turning off cookies may reduce site functionality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Use of Information */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Use of Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the collected information only for the purposes stated when we collected it. Inboz uses your Google profile/email only to identify you, and your Gmail access only to send messages you compose and to retrieve minimal mailbox data (like labels or senders, as needed for scheduling or tracking). We use your campaign content and contact data exclusively to send the campaigns you initiate. Aggregate or anonymized analytics help us improve Inboz's features and security.
              </p>
              <p className="text-muted-foreground mb-4">
                We never sell your personal information. We may process your data on secure servers around the world (e.g. in India or other countries); as Google notes, "regardless of where your information is processed, we apply the same protections". We only share personal data with service providers (see Third-Party Processors below) who are bound by confidentiality and security obligations.
              </p>
            </CardContent>
          </Card>

          {/* Third-Party Processors */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Third-Party Processors</h2>
              <p className="text-muted-foreground mb-4">
                We engage trusted third parties to operate Inboz. For example, we use Stripe for payment processing. Stripe may collect personal data (including via cookies) to provide fraud prevention and payment services. We also host our servers on secure cloud infrastructure (such as Google Cloud or AWS) and use Google Analytics for website metrics. We ensure all processors comply with data protection requirements.
              </p>
              <p className="text-muted-foreground">
                As Google's policy emphasizes, we treat data consistently no matter where it is processed. These third parties will only process data on our behalf and are not allowed to use it for their own purposes.
              </p>
            </CardContent>
          </Card>

          {/* Data Retention and Deletion */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Data Retention and Deletion</h2>
              <p className="text-muted-foreground mb-4">
                We retain your personal data only as long as needed to operate Inboz or as required by law. If you choose to delete your Inboz account, we will delete or anonymize your personal data promptly, as described on the Support page. (Google explains that upon a deletion request, a deletion process begins but "there may be delays between when you delete something and when copies are deleted from our active and backup systems".) Inboz will purge your account data from our active databases; backups may be retained briefly but eventually overwritten. You may also request export of your data before deletion.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Your Rights (GDPR and Indian Law)</h2>
              <p className="text-muted-foreground mb-4">
                If you are an EU user, GDPR grants you rights to access, correct, or delete your personal data, and to withdraw consent. Similarly, the Indian Digital Personal Data Protection Act 2023 recognizes rights to obtain a copy of your personal data, to correct errors, and to erase or withdraw consent. Inboz commits to honoring these rights.
              </p>
              <p className="text-muted-foreground">
                To exercise any data subject right (e.g. to review, update or delete your data), please contact us as detailed on the Support page. We will respond to valid requests without undue delay and in any event within one month, as required by GDPR.
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <Shield className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Security</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                We implement industry-standard technical and organizational measures to protect your data. All data in transit is encrypted with TLS (HTTPS), meaning the information you send to Inboz is protected from interception. Data at rest is stored in encrypted form on secure servers, and access to data is restricted to authorized personnel.
              </p>
              <p className="text-muted-foreground">
                However, no system is 100% secure – as one policy notes, "no security system is impenetrable" and we cannot guarantee absolute security. You should also keep your Google account credentials safe.
              </p>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
              <p className="text-muted-foreground mb-4">
                We use browser cookies to provide essential site functions (session cookies) and to analyze site usage (analytics cookies). A cookie is "a small file containing a string" stored by your browser to remember you when you revisit a site. You may configure your browser to refuse cookies, but this may disable parts of Inboz.
              </p>
            </CardContent>
          </Card>

          {/* Legal Jurisdiction */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Legal Jurisdiction</h2>
              <p className="text-muted-foreground">
                Inboz is registered in Bangalore, India. This Privacy Policy (and Terms of Service) are governed by the laws of India, and any dispute arising from them shall be subject to the exclusive jurisdiction of the courts of India.
              </p>
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
