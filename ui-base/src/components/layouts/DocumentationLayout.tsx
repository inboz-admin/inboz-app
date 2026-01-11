import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { DocNavigation } from "@/components/documentation/DocNavigation";
import { TableOfContents } from "@/components/documentation/TableOfContents";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, X } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { useIsMobile } from "@/hooks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { docNavigation } from "@/config/documentation";

export default function DocumentationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Get current page title from navigation
  const currentPageTitle = useMemo(() => {
    const currentPath = location.pathname;
    // Find the main page (not anchor links)
    const page = docNavigation.find((item) => {
      if (!item.url || item.url === "#") return false;
      // Check if it's an anchor link
      if (item.url.includes("#")) {
        const [basePath] = item.url.split("#");
        return currentPath === basePath;
      }
      return currentPath === item.url || currentPath.startsWith(item.url + "/");
    });
    
    // If not found, try to find by pathname match
    if (!page) {
      const pathMatch = docNavigation.find(
        (item) => item.url && currentPath.startsWith(item.url.split("#")[0])
      );
      return pathMatch?.title || "Documentation";
    }
    
    return page.title;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden -ml-2"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="cursor-pointer -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 relative">
        {/* Left Navigation Sidebar - Fixed */}
        <aside className="hidden md:block fixed left-0 top-14 bottom-0 w-64 border-r border-border bg-background overflow-y-auto z-40">
          <div className="p-4">
            <DocNavigation />
          </div>
        </aside>

        {/* Spacer for fixed left sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0" />

        {/* Main Content - Scrollable */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0"
        >
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 pb-4 border-b border-border">
              <h1 className="text-3xl font-bold text-foreground">{currentPageTitle}</h1>
            </div>
            <Outlet />
          </div>
        </main>

        {/* Right Table of Contents - Fixed */}
        <aside className="hidden xl:block fixed right-0 top-14 bottom-0 w-64 border-l border-border bg-background overflow-y-auto z-40">
          <div className="p-6">
            <TableOfContents contentRef={contentRef} />
          </div>
        </aside>

        {/* Spacer for fixed right sidebar */}
        <div className="hidden xl:block w-64 flex-shrink-0" />
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Documentation</SheetTitle>
          </SheetHeader>
          <div className="p-4 overflow-y-auto">
            <DocNavigation />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
