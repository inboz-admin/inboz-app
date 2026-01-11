import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { DocSection } from "@/types/documentation";

interface TableOfContentsProps {
  contentRef: React.RefObject<HTMLElement>;
}

export function TableOfContents({ contentRef }: TableOfContentsProps) {
  const location = useLocation();
  const [sections, setSections] = useState<DocSection[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Extract only h2 headings (main sections) for quick navigation
    const headings = contentRef.current.querySelectorAll("h2");
    const extractedSections: DocSection[] = [];

    headings.forEach((heading) => {
      const id = heading.id || heading.textContent?.toLowerCase().replace(/\s+/g, "-") || "";
      if (!heading.id) {
        heading.id = id;
      }

      extractedSections.push({
        id,
        title: heading.textContent || "",
        level: 2,
        element: heading as HTMLElement,
      });
    });

    setSections(extractedSections);

    // Set up intersection observer for active section highlighting
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0% -35% 0%",
        threshold: 0,
      }
    );

    headings.forEach((heading) => {
      observerRef.current?.observe(heading);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [contentRef, location.pathname]);

  if (sections.length === 0) {
    return null;
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground mb-4">
        On this page
      </h4>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(section.id);
          }}
          className={cn(
            "block text-sm transition-colors py-1",
            activeSection === section.id
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {section.title}
        </a>
      ))}
    </nav>
  );
}

