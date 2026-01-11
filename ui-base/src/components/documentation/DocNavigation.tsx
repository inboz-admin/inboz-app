import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { docNavigation } from "@/config/documentation";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export function DocNavigation() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "#") return false;
    if (url === "/docs/overview") {
      return (
        location.pathname === "/docs" ||
        location.pathname === "/docs/" ||
        location.pathname === "/docs/overview"
      );
    }
    // Check if it's an anchor link
    if (url.includes("#")) {
      const [basePath, anchor] = url.split("#");
      return location.pathname === basePath && location.hash === `#${anchor}`;
    }
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  return (
    <nav className="space-y-0.5">
      {docNavigation.map((item) => {
        const active = isActive(item.url);
        const isSubItem = !item.icon && docNavigation.findIndex((i) => i === item) > 0;
        
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
              isSubItem && "ml-6"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

