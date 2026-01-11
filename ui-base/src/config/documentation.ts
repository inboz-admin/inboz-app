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
    url: "/docs/overview",
    icon: BookOpen,
  },
  {
    title: "Organizations",
    url: "/docs/organizations",
    icon: Building2,
  },
  {
    title: "User Management",
    url: "/docs/user-management",
    icon: Users,
  },
  {
    title: "Contacts",
    url: "/docs/contacts",
    icon: Contact,
  },
  {
    title: "Contact Lists",
    url: "/docs/contact-lists",
    icon: List,
  },
  {
    title: "Email Templates",
    url: "/docs/templates",
    icon: Layout,
  },
  {
    title: "Campaigns",
    url: "/docs/campaigns",
    icon: Mail,
  },
  {
    title: "Analytics",
    url: "/docs/analytics",
    icon: BarChart3,
  },
  {
    title: "Subscriptions",
    url: "/docs/subscriptions",
    icon: CreditCard,
  },
];

export const docPages: Record<string, DocPageMetadata> = {
  overview: {
    title: "Overview",
    description: "Introduction to the Email Campaign Tool",
    path: "/docs/overview",
    icon: BookOpen,
  },
  analytics: {
    title: "Analytics",
    description: "Analytics dashboard and reporting",
    path: "/docs/analytics",
    icon: BarChart3,
  },
  organizations: {
    title: "Organizations",
    description: "Multi-tenant organization management",
    path: "/docs/organizations",
    icon: Building2,
  },
  "user-management": {
    title: "User Management",
    description: "Users, employees, roles, and permissions",
    path: "/docs/user-management",
    icon: Users,
  },
  contacts: {
    title: "Contacts",
    description: "Contact management and bulk upload",
    path: "/docs/contacts",
    icon: Contact,
  },
  "contact-lists": {
    title: "Contact Lists",
    description: "Contact list creation and management",
    path: "/docs/contact-lists",
    icon: List,
  },
  templates: {
    title: "Email Templates",
    description: "Email template creation and design",
    path: "/docs/templates",
    icon: Layout,
  },
  campaigns: {
    title: "Campaigns",
    description: "Campaign creation, scheduling, and tracking",
    path: "/docs/campaigns",
    icon: Mail,
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Subscription plans, limits, and billing",
    path: "/docs/subscriptions",
    icon: CreditCard,
  },
};

