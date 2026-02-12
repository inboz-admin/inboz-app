"use client";

import * as React from "react";
import {
  AudioWaveform,
  BarChart3,
  Building2,
  Command,
  GalleryVerticalEnd,
  Mail,
  Users,
  UserCheck,
  FileText,
  CreditCard,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import { useAppStore } from "@/stores/appStore";
import { useLocation } from "react-router-dom";
import { getNavigationRoutes } from "@/components/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAppStore((state) => state.user);
  const location = useLocation();

  // Get role-based navigation data
  const userRole = user?.role?.toUpperCase() || "";
  const accessibleRoutePermissions = getNavigationRoutes(userRole);
  const accessibleRoutes = accessibleRoutePermissions.map(
    (permission) => permission.path
  );

  // Navigation data with dynamic active state and role-based filtering
  const navData = React.useMemo(() => {
    // Create role-specific navigation items
    const getNavItemsForRole = () => {
      if (userRole.toLowerCase() === "user") {
        // Navigation for USER role
        return [
          {
            title: "Analytics",
            url: "#",
            icon: BarChart3,
            isActive: location.pathname.startsWith("/dashboard/analytics"),
            items: [
              {
                title: "Analytics",
                url: "/dashboard/analytics",
              },
            ],
            requiredRoute: "/dashboard/analytics",
          },
          {
            title: "Campaign Management",
            url: "#",
            icon: Mail,
            isActive:
              location.pathname.startsWith("/dashboard/contacts") ||
              location.pathname.startsWith("/dashboard/contact-lists") ||
              location.pathname.startsWith("/dashboard/templates") ||
              location.pathname.startsWith("/dashboard/assets") ||
              location.pathname.startsWith("/dashboard/campaigns"),
            items: [
              {
                title: "Contacts",
                url: "/dashboard/contacts",
              },
              {
                title: "Contact Lists",
                url: "/dashboard/contact-lists",
              },
              {
                title: "Templates",
                url: "/dashboard/templates",
              },
              {
                title: "Assets",
                url: "/dashboard/assets",
              },
              {
                title: "Campaigns",
                url: "/dashboard/campaigns",
              },
            ],
            requiredRoutes: [
              "/dashboard/contacts",
              "/dashboard/contact-lists",
              "/dashboard/templates",
              "/dashboard/assets",
              "/dashboard/campaigns",
            ],
          },
        ];
      }

      // Default navigation for admin/superadmin
      return [
        {
          title: "Analytics",
          url: "#",
          icon: BarChart3,
          isActive: location.pathname.startsWith("/dashboard/analytics"),
          items: [
            {
              title: "Analytics",
              url: "/dashboard/analytics",
            },
          ],
          requiredRoute: "/dashboard/analytics",
        },
        {
          title: "Organization",
          url: "#",
          icon: Building2,
          isActive:
            location.pathname.startsWith("/dashboard/organizations") ||
            location.pathname === "/dashboard",
          items: [
            {
              title: "Organizations",
              url: "/dashboard/organizations",
            },
          ],
          requiredRoutes: ["/dashboard/organizations"],
        },
        {
          title: "User Management",
          url: "#",
          icon: Users,
          isActive:
            location.pathname.startsWith("/dashboard/users") ||
            location.pathname.startsWith("/dashboard/platform/employees"),
          items: [
            {
              title: "Users",
              url: "/dashboard/users",
            },
            // Add Platform Employees for SUPERADMIN employees
            ...(user?.type === "employee" && user?.role === "SUPERADMIN"
              ? [
                  {
                    title: "Platform Employees",
                    url: "/dashboard/platform/employees",
                  },
                ]
              : []),
          ],
          requiredRoutes: [
            "/dashboard/users",
            ...(user?.type === "employee" && user?.role === "SUPERADMIN"
              ? ["/dashboard/platform/employees"]
              : []),
          ],
        },
        {
          title: "Campaign Management",
          url: "#",
          icon: Mail,
          isActive:
            location.pathname.startsWith("/dashboard/contacts") ||
            location.pathname.startsWith("/dashboard/contact-lists") ||
            location.pathname.startsWith("/dashboard/templates") ||
            location.pathname.startsWith("/dashboard/assets") ||
            location.pathname.startsWith("/dashboard/campaigns"),
          items: [
            {
              title: "Contacts",
              url: "/dashboard/contacts",
            },
            {
              title: "Contact Lists",
              url: "/dashboard/contact-lists",
            },
            {
              title: "Templates",
              url: "/dashboard/templates",
            },
            {
              title: "Assets",
              url: "/dashboard/assets",
            },
            {
              title: "Campaigns",
              url: "/dashboard/campaigns",
            },
          ],
          requiredRoutes: [
            "/dashboard/contacts",
            "/dashboard/contact-lists",
            "/dashboard/templates",
            "/dashboard/assets",
            "/dashboard/campaigns",
          ],
        },
        {
          title: "Subscription",
          url: "#",
          icon: CreditCard,
          isActive:
            location.pathname.startsWith("/dashboard/subscriptions") ||
            location.pathname.startsWith("/dashboard/invoices"),
          items: [
            {
              title: "Subscriptions",
              url: "/dashboard/subscriptions",
            },
            {
              title: "Invoices",
              url: "/dashboard/invoices",
            },
          ],
          requiredRoutes: [
            "/dashboard/subscriptions",
            "/dashboard/invoices",
          ],
        },
        {
          title: "System",
          url: "#",
          icon: Command,
          isActive: location.pathname.startsWith("/dashboard/audit-logs"),
          items: [
            {
              title: "Audit Logs",
              url: "/dashboard/audit-logs",
            },
          ],
          requiredRoute: "/dashboard/audit-logs",
        },
      ];
    };

    // Use role-specific navigation instead of filtering
    const allNavItems = getNavItemsForRole();

    // Filter navigation items based on user role
    const filteredNavItems = allNavItems
      .filter((navItem) => {
        if (navItem.requiredRoute) {
          return accessibleRoutes.includes(navItem.requiredRoute);
        }
        if (navItem.requiredRoutes) {
          return navItem.requiredRoutes.some((route) =>
            accessibleRoutes.includes(route)
          );
        }
        return false;
      })
      .map((navItem) => {
        // Filter items within each navigation group
        if (navItem.requiredRoutes) {
          const filteredItems = navItem.items.filter((item) =>
            accessibleRoutes.includes(item.url)
          );
          return {
            ...navItem,
            items: filteredItems,
          };
        }
        return navItem;
      })
      .filter((navItem) => navItem.items.length > 0); // Only show groups with accessible items

    return {
      navMain: filteredNavItems,
    };
  }, [location.pathname, accessibleRoutes, userRole]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
