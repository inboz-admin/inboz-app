import { ChevronRight, type LucideIcon } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => {
                    // Check for exact match first
                    let isSubItemActive = location.pathname === subItem.url;

                    // Special cases for dynamic routes
                    if (!isSubItemActive) {
                      if (
                        subItem.url === "/dashboard/organizations" &&
                        location.pathname === "/dashboard"
                      ) {
                        isSubItemActive = true;
                      } else if (
                        subItem.url === "/dashboard/courses" &&
                        location.pathname.startsWith("/dashboard/courses")
                      ) {
                        isSubItemActive = true;
                      } else if (
                        subItem.url === "/dashboard/contacts" &&
                        location.pathname.startsWith("/dashboard/contacts")
                      ) {
                        isSubItemActive = true;
                      } else if (
                        subItem.url === "/dashboard/contact-lists" &&
                        location.pathname.startsWith("/dashboard/contact-lists")
                      ) {
                        isSubItemActive = true;
                      } else if (
                        subItem.url === "/dashboard/templates" &&
                        location.pathname.startsWith("/dashboard/templates")
                      ) {
                        isSubItemActive = true;
                      } else if (
                        subItem.url === "/dashboard/assets" &&
                        location.pathname.startsWith("/dashboard/assets")
                      ) {
                        isSubItemActive = true;
                      } else if (
                        subItem.url === "/dashboard/campaigns" &&
                        location.pathname.startsWith("/dashboard/campaigns")
                      ) {
                        isSubItemActive = true;
                      }
                    }

                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isSubItemActive}
                          className={
                            isSubItemActive
                              ? "bg-accent text-accent-foreground font-medium h-8"
                              : ""
                          }
                        >
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
