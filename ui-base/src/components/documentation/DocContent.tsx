import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocContentProps {
  children: ReactNode;
  className?: string;
}

export function DocContent({ children, className }: DocContentProps) {
  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none font-['Inter',sans-serif]",
        "prose-headings:scroll-mt-20",
        // H1 - Main title - Very Large, Extra Bold
        "prose-h1:text-5xl prose-h1:mb-6 prose-h1:mt-0 prose-h1:font-extrabold prose-h1:text-foreground prose-h1:tracking-tight prose-h1:leading-tight",
        // H2 - Section headers - Medium, Bold, NO border (matching Plane docs style)
        "prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-10 prose-h2:font-bold prose-h2:text-foreground prose-h2:tracking-tight prose-h2:leading-tight",
        // H3 - Sub-section headers - Medium, Bold, NO border (matching Plane docs style)
        "prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-8 prose-h3:font-bold prose-h3:text-foreground prose-h3:tracking-tight prose-h3:leading-tight",
        // H4 - Sub-sub headers - Medium, Medium weight
        "prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-6 prose-h4:font-medium prose-h4:text-foreground prose-h4:leading-snug",
        // Paragraphs - Small size (14px), Normal weight, Muted color, Inter font
        "prose-p:text-sm prose-p:text-muted-foreground prose-p:leading-6 prose-p:mb-4 prose-p:font-normal prose-p:tracking-normal prose-p:font-['Inter',sans-serif]",
        // Links - Primary color, Medium weight
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
        // Strong text - Bold, foreground color
        "prose-strong:text-foreground prose-strong:font-bold",
        // Lists - Proper spacing and styling
        "prose-ul:list-disc prose-ul:ml-6 prose-ul:my-4 prose-ul:space-y-2",
        "prose-ol:list-decimal prose-ol:ml-6 prose-ol:my-4 prose-ol:space-y-2",
        "prose-li:text-muted-foreground prose-li:my-1 prose-li:text-sm prose-li:leading-7 prose-li:font-normal",
        // Code - Inline code with pink/purple background highlight
        "prose-code:text-sm prose-code:bg-pink-100 prose-code:dark:bg-pink-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-foreground prose-code:font-medium prose-code:before:content-[''] prose-code:after:content-['']",
        // Code blocks - Gray background with border
        "prose-pre:bg-slate-100 prose-pre:dark:bg-slate-900 prose-pre:border prose-pre:border-slate-200 prose-pre:dark:border-slate-800 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto",
        // Blockquotes - Styled with border
        "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4 prose-blockquote:text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DocCalloutProps {
  variant?: "info" | "warning" | "success" | "error" | "tip" | "important";
  title?: string;
  children: ReactNode;
}

export function DocCallout({
  variant = "info",
  title,
  children,
}: DocCalloutProps) {
  const variants = {
    info: {
      container: "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20",
      text: "text-blue-900 dark:text-blue-200",
      title: "text-blue-900 dark:text-blue-100",
      icon: "💡",
    },
    warning: {
      container: "border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
      text: "text-yellow-900 dark:text-yellow-200",
      title: "text-yellow-900 dark:text-yellow-100",
      icon: "⚠️",
    },
    success: {
      container: "border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20",
      text: "text-green-900 dark:text-green-200",
      title: "text-green-900 dark:text-green-100",
      icon: "✓",
    },
    error: {
      container: "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20",
      text: "text-red-900 dark:text-red-200",
      title: "text-red-900 dark:text-red-100",
      icon: "❌",
    },
    tip: {
      container: "border-l-4 border-teal-500 bg-teal-50 dark:bg-teal-950/20",
      text: "text-teal-900 dark:text-teal-200",
      title: "text-teal-900 dark:text-teal-100",
      icon: "⭐",
    },
    important: {
      container: "border-l-4 border-pink-500 bg-pink-50 dark:bg-pink-950/20",
      text: "text-pink-900 dark:text-pink-200",
      title: "text-pink-900 dark:text-pink-100",
      icon: "!",
    },
  };

  const variantStyle = variants[variant] || variants.info;

  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-4 my-6 relative",
        variantStyle.container
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{variantStyle.icon}</span>
        <div className="flex-1">
          {title && (
            <h4 className={cn("font-semibold mb-2", variantStyle.title)}>
              {title.toUpperCase()}:
            </h4>
          )}
          <div className={cn("text-sm leading-relaxed", variantStyle.text)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DocStepProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function DocStep({ number, title, children }: DocStepProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
          {number}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <div className="text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface DocFeatureListProps {
  items: string[];
}

export function DocFeatureList({ items }: DocFeatureListProps) {
  return (
    <ul className="space-y-2 my-4">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="text-primary mt-1">✓</span>
          <span className="text-muted-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

