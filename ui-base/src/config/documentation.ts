import {
  BarChart3,
  Building2,
  Users,
  Mail,
  FileText,
  CreditCard,
  BookOpen,
  Contact,
  List,
  Layout,
  Receipt,
} from "lucide-react";
import type { DocNavItem, DocPageMetadata } from "@/types/documentation";

export const docNavigation: DocNavItem[] = [
  {
    title: "Overview",
    url: "/documentation/overview",
    icon: BookOpen,
  },
  {
    title: "Organizations",
    url: "/documentation/organizations",
    icon: Building2,
  },
  {
    title: "User Management",
    url: "/documentation/user-management",
    icon: Users,
  },
  {
    title: "Contacts",
    url: "/documentation/contacts",
    icon: Contact,
  },
  {
    title: "Contact Lists",
    url: "/documentation/contact-lists",
    icon: List,
  },
  {
    title: "Email Templates",
    url: "/documentation/templates",
    icon: Layout,
  },
  {
    title: "Campaigns",
    url: "/documentation/campaigns",
    icon: Mail,
  },
  {
    title: "Analytics",
    url: "/documentation/analytics",
    icon: BarChart3,
  },
  {
    title: "Subscriptions",
    url: "/documentation/subscriptions",
    icon: CreditCard,
  },
];

export const docPages: Record<string, DocPageMetadata> = {
  overview: {
    title: "Overview",
    description: "Introduction to the Email Campaign Tool",
    path: "/documentation/overview",
    icon: BookOpen,
  },
  analytics: {
    title: "Analytics",
    description: "Analytics dashboard and reporting",
    path: "/documentation/analytics",
    icon: BarChart3,
  },
  organizations: {
    title: "Organizations",
    description: "Multi-tenant organization management",
    path: "/documentation/organizations",
    icon: Building2,
  },
  "user-management": {
    title: "User Management",
    description: "Users, employees, roles, and permissions",
    path: "/documentation/user-management",
    icon: Users,
  },
  contacts: {
    title: "Contacts",
    description: "Contact management and bulk upload",
    path: "/documentation/contacts",
    icon: Contact,
  },
  "contact-lists": {
    title: "Contact Lists",
    description: "Contact list creation and management",
    path: "/documentation/contact-lists",
    icon: List,
  },
  templates: {
    title: "Email Templates",
    description: "Email template creation and design",
    path: "/documentation/templates",
    icon: Layout,
  },
  campaigns: {
    title: "Campaigns",
    description: "Campaign creation, scheduling, and tracking",
    path: "/documentation/campaigns",
    icon: Mail,
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Subscription plans, limits, and billing",
    path: "/documentation/subscriptions",
    icon: CreditCard,
  },
};

