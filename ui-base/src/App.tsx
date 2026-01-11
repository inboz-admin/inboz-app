import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import Home from "@/pages/Home";
import { LoginPage } from "@/pages/login";
import GetStartedPage from "@/pages/getstarted/GetStartedPage";
import AuthErrorPage from "@/pages/auth/AuthErrorPage";
import OAuthCallbackPage from "@/pages/auth/OAuthCallbackPage";
import EmployeeLoginPage from "@/pages/auth/EmployeeLoginPage";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DocumentationLayout from "@/components/layouts/DocumentationLayout";
import { OrganizationsPage } from "@/pages/organization";
import { EmployeesPage } from "@/pages/employee";
import { PlatformEmployeesPage } from "@/pages/employee/PlatformEmployeesPage";
import { UsersPage } from "@/pages/user";
import { AuditLogsPage } from "@/pages/audit";
import { ProfilePage } from "@/pages/profile";
import ContactsPage from "@/pages/contact/ContactsPage";
import { ContactListsPage, ContactListDetailPage } from "@/pages/contact-list";
import TemplateListPage from "@/pages/email-templates/TemplateListPage";
import { CampaignListPage } from "@/pages/campaigns";
import { CampaignBuilderPage } from "@/pages/campaigns";
import { SubscriptionsPage } from "@/pages/subscriptions";
import SubscriptionDetailPage from "@/pages/subscriptions/SubscriptionDetailPage";
import { InvoicesPage } from "@/pages/invoices";
import { AnalyticsPage } from "@/pages/analytics";
import { TermsOfServicePage, PrivacyPolicyPage } from "@/pages/legal";
import { ProtectedRouteWithRole } from "@/components/auth";
import { ThemeProvider } from "@/components/providers";

import { Toaster } from "@/components/ui/sonner";

// Lazy load documentation pages
const OverviewPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.OverviewPage }))
);
const AnalyticsDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.AnalyticsPage }))
);
const OrganizationsDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.OrganizationsPage }))
);
const UserManagementPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.UserManagementPage }))
);
const ContactsDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.ContactsPage }))
);
const ContactListsDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.ContactListsPage }))
);
const EmailTemplatesDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.EmailTemplatesPage }))
);
const CampaignsDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.CampaignsPage }))
);
const SystemDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.SystemPage }))
);
const SubscriptionsDocPage = lazy(() =>
  import("@/pages/documentation").then((m) => ({ default: m.SubscriptionsPage }))
);

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* <Route path="/login" element={<LoginPage />} /> */}
            <Route path="/get-started" element={<GetStartedPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/auth/error" element={<AuthErrorPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route path="/admin/login" element={<EmployeeLoginPage />} />
            <Route path="/platform/login" element={<EmployeeLoginPage />} />
            <Route path="/docs" element={<DocumentationLayout />}>
              <Route index element={<Navigate to="/docs/overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="analytics" element={<AnalyticsDocPage />} />
              <Route path="organizations" element={<OrganizationsDocPage />} />
              <Route path="user-management" element={<UserManagementPage />} />
              <Route path="contacts" element={<ContactsDocPage />} />
              <Route path="contact-lists" element={<ContactListsDocPage />} />
              <Route path="templates" element={<EmailTemplatesDocPage />} />
              <Route path="campaigns" element={<CampaignsDocPage />} />
              <Route path="subscriptions" element={<SubscriptionsDocPage />} />
              <Route path="system" element={<SystemDocPage />} />
            </Route>
            <Route
              path="dashboard"
              element={
                <ProtectedRouteWithRole>
                  <DashboardLayout />
                </ProtectedRouteWithRole>
              }
            >
              <Route index element={<OrganizationsPage />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="contact-lists" element={<ContactListsPage />} />
              <Route
                path="contact-lists/:id"
                element={<ContactListDetailPage />}
              />
              <Route path="templates" element={<TemplateListPage />} />
              <Route path="campaigns" element={<CampaignListPage />} />
              <Route path="campaigns/new" element={<CampaignBuilderPage />} />
              <Route path="campaigns/:id" element={<CampaignBuilderPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="platform/employees" element={<PlatformEmployeesPage />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
