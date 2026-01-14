import { useEffect } from "react";

export interface OrganizationStructuredData {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactPoint?: {
    "@type": string;
    contactType: string;
    email?: string;
  };
  sameAs?: string[];
}

export interface WebSiteStructuredData {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    "@type": string;
    target: {
      "@type": string;
      urlTemplate: string;
    };
    "query-input": string;
  };
}

export interface BreadcrumbStructuredData {
  "@context": string;
  "@type": string;
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item?: string;
  }>;
}

interface StructuredDataProps {
  data:
    | OrganizationStructuredData
    | WebSiteStructuredData
    | BreadcrumbStructuredData
    | Record<string, unknown>;
  id?: string;
}

/**
 * Component to inject structured data (JSON-LD) into the page
 * Helps search engines understand the content better
 */
export function StructuredData({ data, id = "structured-data" }: StructuredDataProps) {
  useEffect(() => {
    // Remove existing script with same id if it exists
    const existingScript = document.getElementById(id);
    if (existingScript) {
      existingScript.remove();
    }

    // Create new script element with JSON-LD
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.getElementById(id);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data, id]);

  return null;
}

/**
 * Default organization structured data for Inboz
 */
export const defaultOrganizationData: OrganizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Inboz",
  url: "https://inboz.io",
  description:
    "Comprehensive email campaign management platform for organizations",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
  },
};

/**
 * Default website structured data for Inboz
 */
export const defaultWebSiteData: WebSiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Inboz",
  url: "https://inboz.io",
  description:
    "Comprehensive email campaign management platform for organizations",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://inboz.io/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};
