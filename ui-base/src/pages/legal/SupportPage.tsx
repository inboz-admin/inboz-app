import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Mail, HelpCircle, Shield, Trash2, AlertTriangle } from "lucide-react";

export default function SupportPage() {
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
          <h1 className="text-4xl font-bold mb-4">Support</h1>
          <p className="text-muted-foreground">
            Get help with Inboz or contact our support team
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Contact Support */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <HelpCircle className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Contact Support</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                For help or questions, please contact Inboz support. We typically respond to inquiries within 1–2 business days.
              </p>
              <div className="space-y-2">
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
            </CardContent>
          </Card>

          {/* Revoking Google Access */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <Shield className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Revoking Google Access</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                If you wish to disconnect Inboz from your Google account, you can revoke its OAuth permissions.
              </p>
              <div className="space-y-3 text-muted-foreground">
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>In your Google Account, go to <strong>Security</strong> → <strong>Third-party apps with account access</strong> → <strong>Manage third-party access</strong></li>
                  <li>Locate "Inboz" in the list and click <strong>"Remove Access"</strong></li>
                  <li>This will immediately prevent Inboz from accessing your Google data</li>
                  <li>You can re-authorize Inboz later by signing in again</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Account/Data Deletion */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <Trash2 className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Account/Data Deletion</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                To delete your Inboz account and all associated data, email us with the subject "Delete my Inboz account."
              </p>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@inboz.io?subject=Delete my Inboz account"
                    className="text-primary hover:underline"
                  >
                    support@inboz.io
                  </a>
                </p>
                <p className="mb-2">Upon verification, we will delete your personal data in accordance with our Privacy Policy.</p>
                <p className="text-sm italic">
                  As noted in Google's policy, deletion requests trigger a process where data is removed, although there may be a short delay before it is purged from backups. We will confirm once deletion is complete.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy or Abuse Reports */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Privacy or Abuse Reports</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                If you have any privacy concerns or believe someone is misusing our service, please contact us immediately.
              </p>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@inboz.io"
                    className="text-primary hover:underline"
                  >
                    support@inboz.io
                  </a>
                </p>
                <p>We take abuse and privacy seriously; we will investigate and take appropriate action.</p>
                <p>If you wish to report spam or abuse originating from Gmail, you may also use Google's abuse reporting tools.</p>
                <p>For other legal or urgent concerns, please clearly describe the issue in your email so we can address it promptly.</p>
              </div>
            </CardContent>
          </Card>

          {/* Copyright Notice */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <Mail className="w-6 h-6 text-primary mt-1" />
                <h2 className="text-2xl font-semibold">Copyright Notice</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Inboz respects copyright. If you believe your copyrighted work has been used in our service without permission, please notify us.
              </p>
              <p className="text-muted-foreground">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:support@inboz.io"
                  className="text-primary hover:underline"
                >
                  support@inboz.io
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>Thank you for using Inboz. We value your trust and strive to keep your data secure and private.</p>
            <p className="mt-2">© 2026 Inboz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
