"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "@/components/providers";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const themes = [
  {
    value: "light" as const,
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Dark",
    icon: Moon,
  },
  {
    value: "system" as const,
    label: "System",
    icon: Monitor,
  },
];

export function AdvancedThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50"
      >
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center">
              <themeOption.icon className="mr-2 h-4 w-4" />
              <span>{themeOption.label}</span>
            </div>
            {theme === themeOption.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
