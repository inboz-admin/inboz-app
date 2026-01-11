import { type LucideIcon } from "lucide-react";

export interface DocNavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: DocNavItem[];
}

export interface DocSection {
  id: string;
  title: string;
  level: number;
  element?: HTMLElement;
}

export interface DocPageMetadata {
  title: string;
  description: string;
  path: string;
  icon?: LucideIcon;
}

