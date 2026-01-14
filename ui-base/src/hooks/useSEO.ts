import { useEffect } from "react";

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

const defaultSEO: SEOData = {
  title: "Inboz - Email Campaign Management Platform for Organizations",
  description:
    "Inboz - Comprehensive email campaign management platform for organizations. Manage contacts, email campaigns, templates, analytics, and more with our powerful system.",
  keywords: "email marketing, campaign management, email campaigns, contact management, CRM, email automation, marketing automation",
  ogTitle: "Inboz - Email Campaign Management Platform",
  ogDescription:
    "Comprehensive email campaign management platform for organizations. Manage contacts, email campaigns, templates, analytics, and more.",
  ogImage: "https://inboz.io/og-image.jpg",
  ogUrl: "https://inboz.io/",
  twitterTitle: "Inboz - Email Campaign Management Platform",
  twitterDescription:
    "Comprehensive email campaign management platform for organizations. Manage contacts, email campaigns, templates, analytics, and more.",
  twitterImage: "https://inboz.io/og-image.jpg",
  canonicalUrl: "https://inboz.io/",
  noindex: false,
  nofollow: false,
};

/**
 * Hook to manage SEO meta tags dynamically
 * Updates document head with SEO information for each page
 */
export function useSEO(seoData?: Partial<SEOData>) {
  useEffect(() => {
    const data = { ...defaultSEO, ...seoData };

    // Update title
    if (data.title) {
      document.title = data.title;
    }

    // Helper function to update or create meta tag
    const updateMetaTag = (name: string, content: string, attribute: string = "name") => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Helper function to update or create link tag
    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    };

    // Update meta tags
    if (data.description) {
      updateMetaTag("description", data.description);
    }

    if (data.keywords) {
      updateMetaTag("keywords", data.keywords);
    }

    // Robots meta
    const robotsContent = [
      data.noindex ? "noindex" : "index",
      data.nofollow ? "nofollow" : "follow",
    ].join(", ");
    updateMetaTag("robots", robotsContent);

    // Open Graph tags
    if (data.ogTitle) {
      updateMetaTag("og:title", data.ogTitle, "property");
    }
    if (data.ogDescription) {
      updateMetaTag("og:description", data.ogDescription, "property");
    }
    if (data.ogImage) {
      updateMetaTag("og:image", data.ogImage, "property");
    }
    if (data.ogUrl) {
      updateMetaTag("og:url", data.ogUrl, "property");
    }

    // Twitter Card tags
    if (data.twitterTitle) {
      updateMetaTag("twitter:title", data.twitterTitle, "property");
    }
    if (data.twitterDescription) {
      updateMetaTag("twitter:description", data.twitterDescription, "property");
    }
    if (data.twitterImage) {
      updateMetaTag("twitter:image", data.twitterImage, "property");
    }

    // Canonical URL
    if (data.canonicalUrl) {
      updateLinkTag("canonical", data.canonicalUrl);
    }

    // Cleanup function to restore defaults when component unmounts
    return () => {
      // Optionally restore default SEO when leaving page
      // This is optional - you might want to keep the last page's SEO
    };
  }, [seoData]);
}
