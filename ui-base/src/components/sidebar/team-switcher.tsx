"use client";

import * as React from "react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton 
          size="lg" 
          className="cursor-pointer p-0 m-0 hover:bg-transparent active:bg-transparent focus-visible:ring-0"
        >
          <div className="flex items-center justify-start w-full p-0 m-0">
              <img 
                src="/brand/63.svg" 
                alt="Inboz Logo" 
                className="h-32 w-32 object-contain dark:brightness-0 dark:invert transition-all p-0 m-0"
              />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
