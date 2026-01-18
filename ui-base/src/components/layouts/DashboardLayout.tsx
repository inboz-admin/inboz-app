import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { QuotaDisplay } from "@/components/common/QuotaDisplay";
import { QuotaDatePicker } from "@/components/common/QuotaDatePicker";
import { OrganizationSelector } from "@/components/common/OrganizationSelector";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { PushNotificationPrompt } from "@/components/common/PushNotificationPrompt";
import { GmailTokenStatusBanner } from "@/components/auth/GmailTokenStatusBanner";
import { useNotifications } from "@/hooks/useNotifications";
import { useLocation, Outlet, Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAppStore } from "@/stores";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { Badge } from "@/components/ui/badge";

// Navigation data for breadcrumb generation
const navData = {
  navMain: [
    {
      title: "Organization",
      url: "#",
      items: [{ title: "Organizations", url: "/dashboard/organizations" }],
    },
    {
      title: "User Management",
      url: "#",
      items: [{ title: "Employees", url: "/dashboard/employees" }],
    },
    {
      title: "System",
      url: "#",
      items: [{ title: "Audit Logs", url: "/dashboard/audit-logs" }],
    },
  ],
};

interface BreadcrumbItem {
  title: string;
  url?: string;
  isCurrentPage?: boolean;
}

export default function DashboardLayout() {
  const location = useLocation();
  const { user } = useAppStore();
  const isEmployee = user?.type === "employee";
  const timezone = useOrganizationTimezone();
  
  // Initialize notification WebSocket connection
  useNotifications();
  
  // Get timezone abbreviation for badge display
  const getTimezoneAbbr = (tz: string): string => {
    if (!tz || tz === 'UTC') return 'UTC';
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short'
      });
      return formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || tz;
    } catch {
      return tz;
    }
  };
  
  const tzAbbr = getTimezoneAbbr(timezone);

  // Generate dynamic breadcrumbs based on current path
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const path = location.pathname;
    const breadcrumbItems: BreadcrumbItem[] = [];

    // Always start with Dashboard
    breadcrumbItems.push({ title: "Dashboard", url: "/dashboard" });

    // If we're on the main dashboard page or organizations (default), show Organizations
    if (path === "/dashboard" || path === "/dashboard/organizations") {
      breadcrumbItems.push({ title: "Organizations", isCurrentPage: true });
      return breadcrumbItems;
    }

    // Handle profile page
    if (path === "/dashboard/profile") {
      breadcrumbItems.push({ title: "Profile", isCurrentPage: true });
      return breadcrumbItems;
    }

    // Handle analytics page
    if (path === "/dashboard/analytics") {
      breadcrumbItems.push({ title: "Analytics", isCurrentPage: true });
      return breadcrumbItems;
    }

    // Handle subscription detail page
    if (path.startsWith("/dashboard/subscriptions/") && path !== "/dashboard/subscriptions") {
      breadcrumbItems.push({ title: "Subscriptions", url: "/dashboard/subscriptions" });
      breadcrumbItems.push({ title: "Subscription Details", isCurrentPage: true });
      return breadcrumbItems;
    }

    // Find the matching navigation item
    for (const section of navData.navMain) {
      const matchingItem = section.items?.find((item) => item.url === path);
      if (matchingItem) {
        // Add section as intermediate breadcrumb
        breadcrumbItems.push({ title: section.title });
        // Add current page
        breadcrumbItems.push({
          title: matchingItem.title,
          isCurrentPage: true,
        });
        break;
      }
    }

    // Handle enquiry paths specifically
    if (path.includes("/enquiries/")) {
      breadcrumbItems.push({ title: "Business" });
      breadcrumbItems.push({ title: "Enquiries", url: "/dashboard/enquiries" });
      return breadcrumbItems;
    }

    // If no match found, generate from path segments
    if (breadcrumbItems.length === 1) {
      const segments = path.split("/").filter(Boolean).slice(1); // Remove 'dashboard'
      segments.forEach((segment, index) => {
        const title = segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        breadcrumbItems.push({
          title,
          isCurrentPage: index === segments.length - 1,
        });
      });
    }

    return breadcrumbItems;
  }, [location.pathname]);

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4 flex-1">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => (
                    <div key={item.title} className="flex items-center">
                      {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                      <BreadcrumbItem>
                        {item.isCurrentPage ? (
                          <BreadcrumbPage>{item.title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={item.url || "#"}>{item.title}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2 px-4">
              {isEmployee && <OrganizationSelector />}
              <Badge 
                variant="outline" 
                className="px-2.5 py-1.5 text-xs font-normal"
                title={timezone}
              >
                {tzAbbr}
              </Badge>
              {/* Hide quota check for SUPERADMIN and SUPPORT */}
              {user?.role !== "SUPERADMIN" && user?.role !== "SUPPORT" && (
                <>
                  <QuotaDisplay />
                  <QuotaDatePicker />
                </>
              )}
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>
          <GmailTokenStatusBanner />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <PushNotificationPrompt />
    </>
  );
}
