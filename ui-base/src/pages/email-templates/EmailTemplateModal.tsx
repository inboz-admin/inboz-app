"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VariablePicker } from "./VariablePicker";
import { emailTemplateService } from "@/api/emailTemplateService";
import { EmailTemplateType, EmailSendFormat, type EmailTemplate } from "@/api/emailTemplateTypes";
import { useAppStore } from "@/stores/appStore";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";
import { TiptapEditor } from "@/components/TiptapEditor";
import { Switch } from "@/components/ui/switch";
import { EmailTemplateBuilder } from "@/components/email-builder";
import type { BuilderData } from "@/components/email-builder/types";
import { htmlToBuilder } from "@/components/email-builder/utils/htmlToBuilder";
import { builderToHtml } from "@/components/email-builder/utils/builderToHtml";
import { API_CONFIG } from "@/config/constants";

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  type: z.nativeEnum(EmailTemplateType).optional(),
  sendFormat: z.nativeEnum(EmailSendFormat).optional(),
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  plainText: z.string().optional(),
}).refine(
  (data) => data.htmlContent || data.textContent,
  {
    message: "Either HTML content or text content is required",
    path: ["htmlContent"],
  }
);

type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;

/**
 * Default contact data for preview variable replacement
 */
const DEFAULT_PREVIEW_CONTACT_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  jobTitle: 'Software Engineer',
  company: 'Acme Corp',
  companyDomain: 'acme.com',
  companyWebsite: 'https://acme.com',
  companyIndustry: 'Technology',
  companySize: '50-100',
};

/**
 * Replace variables in content with preview data
 */
const replaceVariables = (content: string, contactData: Record<string, string> = DEFAULT_PREVIEW_CONTACT_DATA): string => {
  if (!content) return content;
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return contactData[key as keyof typeof contactData] || match;
  });
};

/**
 * Rewrite image URLs in HTML to use relative /uploads path so they load via Vite proxy (same origin).
 * Fixes preview images not loading when URLs point to backend (e.g. localhost:4000) in dev.
 */
const rewritePreviewImageUrls = (html: string): string => {
  const uploadBase = API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, "");
  if (!uploadBase || !import.meta.env.DEV) return html;
  if (!uploadBase.includes("localhost") && !uploadBase.includes("127.0.0.1"))
    return html;
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const baseRegex = new RegExp(
    escapeRegex(uploadBase) + "(/uploads/[^\"'\\s>]+)",
    "gi"
  );
  return html.replace(baseRegex, "$1");
};

/**
 * Extract body content from full HTML document or return as-is if already just body content
 */
const extractBodyContent = (html: string): string => {
  // Check if it's a full HTML document
  if (html.includes('<body')) {
    // Extract content between <body> tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }
  }
  // If no body tag, return as-is (might be just body content)
  return html;
};

/**
 * Email Preview Component - Theme-aware HTML preview
 * Matches the editor's styling exactly (fonts, colors, alignment, etc.)
 * Uses div instead of iframe for better theme integration
 */
const EmailPreviewContent = ({ htmlContent }: { htmlContent: string }) => {
  const content = rewritePreviewImageUrls(extractBodyContent(htmlContent));

  return (
    <>
      <style>{`
        .email-preview-content {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          font-size: 14px;
          line-height: 1.6;
        }
        .email-preview-content p {
          margin: 0.5em 0;
        }
        .email-preview-content h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1rem 0;
        }
        .email-preview-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.75rem 0;
        }
        .email-preview-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.5rem 0;
        }
        .email-preview-content h4 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0.5rem 0;
        }
        .email-preview-content h5 {
          font-size: 0.875rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }
        .email-preview-content h6 {
          font-size: 0.75rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }
        .email-preview-content ul,
        .email-preview-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        .email-preview-content ul {
          list-style-type: disc;
        }
        .email-preview-content ol {
          list-style-type: decimal;
        }
        .email-preview-content li {
          margin: 0.25rem 0;
        }
        .email-preview-content blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1rem;
          font-style: italic;
          margin: 0.5rem 0;
          color: hsl(var(--muted-foreground));
        }
        .email-preview-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }
        .email-preview-content a:hover {
          opacity: 0.8;
        }
        .email-preview-content code {
          background-color: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        .email-preview-content pre {
          background-color: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.25rem;
          overflow-x: auto;
          margin: 0.5rem 0;
        }
        .email-preview-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .email-preview-content hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1rem 0;
        }
        .email-preview-content table[role="presentation"] {
          padding: 10px !important;
        }
      `}</style>
      <div
        className="email-preview-content p-4 text-foreground min-h-[200px]"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
};

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: EmailTemplate | null;
  isViewMode?: boolean;
  canUpdate?: boolean;
}

export default function EmailTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  template,
  isViewMode = false,
  canUpdate = true,
}: EmailTemplateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState<any[]>([]);
  const [selectedSystemTemplateId, setSelectedSystemTemplateId] = useState<string | null>(null);
  const [userManuallySetHtml, setUserManuallySetHtml] = useState(false);
  const [useBuilder, setUseBuilder] = useState(false);
  const [builderData, setBuilderData] = useState<BuilderData | null>(null);
  const { user } = useAppStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      category: "",
      type: EmailTemplateType.PRIVATE,
      sendFormat: EmailSendFormat.TEXT,
      subject: "",
      htmlContent: "",
      textContent: "",
      plainText: "",
    },
  });

  const watchedValues = watch();
  
  // Check if all required fields are filled
  const isFormValid = watchedValues.name?.trim() && 
                     watchedValues.subject?.trim() && 
                     (watchedValues.htmlContent?.trim() || watchedValues.textContent?.trim()) &&
                     (!useBuilder || (builderData && builderData.elements && builderData.elements.length > 0));

  // Load system templates when modal opens (only for create mode)
  useEffect(() => {
    if (isOpen && !template) {
      emailTemplateService.getSystemTemplates()
        .then((templates) => {
          if (Array.isArray(templates)) {
            setSystemTemplates(templates);
          }
        })
        .catch((error) => {
          console.error('Error loading system templates:', error);
          setSystemTemplates([]);
        });
    }
  }, [isOpen, template]);

  // Reset form when modal opens or template changes
  useEffect(() => {
    if (isOpen) {
      const htmlContent = template?.htmlContent || "";
      const textContent = template?.textContent || "";
      const sendFormat = template?.sendFormat || EmailSendFormat.TEXT;
      const designSettings = template?.designSettings;
      
      // Check if template was created with builder
      const hasBuilderData = designSettings && 
        typeof designSettings === 'object' && 
        'mode' in designSettings && 
        designSettings.mode === 'builder';
      
      reset({
        name: template?.name || "",
        category: template?.category || "",
        type: template?.type || EmailTemplateType.PRIVATE,
        sendFormat: sendFormat,
        subject: template?.subject || "",
        htmlContent: htmlContent,
        textContent: textContent,
        plainText: template?.plainText || "",
      });
      
      setSelectedSystemTemplateId(null);
      setUserManuallySetHtml(sendFormat === EmailSendFormat.HTML);

      // Load builder data if exists - auto-enable builder mode
      if (hasBuilderData && designSettings) {
        setBuilderData(designSettings as BuilderData);
        setUseBuilder(true);
        // Don't show HTML content when builder is active
        setValue("htmlContent", "", { shouldDirty: false, shouldValidate: false });
      } else if (htmlContent && !hasBuilderData) {
        // Try to convert existing HTML to builder format
        try {
          const converted = htmlToBuilder(htmlContent);
          if (converted.elements.length > 0) {
            setBuilderData(converted);
            setUseBuilder(false); // Don't auto-enable, let user choose
          }
        } catch (e) {
          // Ignore conversion errors
        }
      } else {
        setBuilderData(null);
        setUseBuilder(false);
      }
    } else {
      // Clear form when modal closes
      reset({
        name: "",
        category: "",
        type: EmailTemplateType.PRIVATE,
        sendFormat: EmailSendFormat.TEXT,
        subject: "",
        htmlContent: "",
        textContent: "",
        plainText: "",
      });
      setSelectedSystemTemplateId(null);
      setUserManuallySetHtml(false);
      setUseBuilder(false);
      setBuilderData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, template, reset]);

  // Handle system template selection
  const handleSystemTemplateSelect = async (templateId: string) => {
    if (!templateId || templateId === 'none') {
      setSelectedSystemTemplateId(null);
      return;
    }

    try {
      // Find the template from the already loaded system templates
      const template = systemTemplates.find((st: any) => st.id === templateId);
      if (template) {
        setSelectedSystemTemplateId(templateId);
        setValue("subject", template.subject || "", { shouldDirty: true, shouldValidate: true });
        setValue("htmlContent", template.htmlContent || "", { shouldDirty: true, shouldValidate: true });
        // Preserve text content with actual line breaks and formatting
        setValue("textContent", template.textContent || "", { shouldDirty: true, shouldValidate: true });
        setValue("category", template.category || "", { shouldDirty: true, shouldValidate: true });
        // Reset to "Text" format when system template is selected, unless user manually set it to HTML
        if (!userManuallySetHtml) {
          setValue("sendFormat", EmailSendFormat.TEXT, { shouldDirty: true, shouldValidate: true });
        }
      }
    } catch (error) {
      console.error('Error loading system template:', error);
      toast.error('Failed to load system template');
    }
  };

  // Convert plain text with URLs to HTML with clickable links
  const convertTextToHtml = (text: string): string => {
    if (!text) return '';
    
    // First, find and replace URLs with placeholders to preserve them
    const urlPlaceholders: string[] = [];
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
    let html = text.replace(urlRegex, (url) => {
      const placeholder = `__URL_PLACEHOLDER_${urlPlaceholders.length}__`;
      urlPlaceholders.push(url);
      return placeholder;
    });
    
    // Escape HTML to prevent XSS
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Restore URLs and convert them to HTML links
    urlPlaceholders.forEach((url, index) => {
      const placeholder = `__URL_PLACEHOLDER_${index}__`;
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const escapedUrl = fullUrl
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      html = html.replace(placeholder, `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    });
    
    // Convert line breaks to <br> tags
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags
    return `<p>${html}</p>`;
  };

  // Convert HTML to plain text (for textContent fallback)
  const convertHtmlToText = (html: string): string => {
    if (!html) return '';
    
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, (match, url, text) => {
        const linkText = text.trim() || url;
        return linkText === url ? url : `${linkText} (${url})`;
      })
      .replace(/<br\s*\/?>(?=\s*<)/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  };

  const onSubmit = async (data: EmailTemplateFormData) => {
    if (!user?.organizationId) {
      toast.error("Organization not found");
      return;
    }

    setIsLoading(true);
    try {
      let finalHtmlContent = data.htmlContent;
      let finalTextContent = data.textContent;
      let finalPlainText = data.plainText;
      
      // If builder was used, convert builder data to HTML and save both
      if (useBuilder && builderData) {
        finalHtmlContent = builderToHtml(builderData);
        finalTextContent = convertHtmlToText(finalHtmlContent);
        finalPlainText = convertHtmlToText(finalHtmlContent);
      } else if (data.sendFormat === EmailSendFormat.TEXT) {
        // For TEXT format:
        // - textContent: TipTap HTML conversion (for sending with links)
        // - plainText: Plain text with line breaks (for preview)
        // - htmlContent: Only saved once from system templates (preserve if exists, don't overwrite)
        
        // textContent: TipTap HTML (already set from onChange handler)
        finalTextContent = data.textContent || undefined;
        
        // plainText: Plain text with line breaks (already set from onChange handler)
        finalPlainText = data.plainText || undefined;
        
        // htmlContent: Only preserve if it came from system templates (don't overwrite)
        // Keep existing htmlContent if template exists and has it, otherwise undefined
        if (template?.htmlContent) {
          finalHtmlContent = template.htmlContent; // Preserve existing from system template
        } else {
          finalHtmlContent = undefined; // Don't save TipTap HTML here
        }
      } else if (data.sendFormat === EmailSendFormat.HTML && data.htmlContent) {
        // For HTML format:
        // - textContent: null
        // - plainText: null
        // - htmlContent: Actual HTML content
        finalHtmlContent = data.htmlContent;
        finalTextContent = undefined;
        finalPlainText = undefined;
      }

      // Prepare designSettings if builder was used
      const designSettings = useBuilder && builderData ? builderData : undefined;

      if (template) {
        await emailTemplateService.updateTemplate(template.id, {
          name: data.name,
          subject: data.subject,
          htmlContent: finalHtmlContent || undefined,
          textContent: finalTextContent || undefined,
          plainText: finalPlainText || undefined,
          category: data.category,
          type: data.type,
          sendFormat: data.sendFormat,
          designSettings,
        });
        toast.success("Template updated successfully");
      } else {
        await emailTemplateService.createTemplate({
          organizationId: user.organizationId,
          name: data.name,
          subject: data.subject,
          htmlContent: finalHtmlContent || undefined,
          textContent: finalTextContent || undefined,
          plainText: finalPlainText || undefined,
          category: data.category,
          type: data.type,
          sendFormat: data.sendFormat,
          systemTemplateId: selectedSystemTemplateId || undefined,
          designSettings,
        } as any);
        toast.success("Template created successfully");
      }
      
      // Reset form after successful submission
      reset({
        name: "",
        category: "",
        type: EmailTemplateType.PRIVATE,
        sendFormat: EmailSendFormat.TEXT,
        subject: "",
        htmlContent: "",
        textContent: "",
        plainText: "",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving template:", error);
      
      // Handle 409 Conflict errors (duplicate template name)
      if (error?.statusCode === 409 || error?.error?.code === "CONFLICT") {
        const errorMessage = error?.message || error?.error?.details?.message || "A template with this name already exists in your organization";
        toast.error(errorMessage);
      } else {
        // Generic error for other cases
        toast.error("Failed to save template");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariableInsert = (variable: string) => {
    const currentSubject = watchedValues.subject || "";
    setValue("subject", currentSubject + `{{${variable}}}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-none !w-[95vw] !h-[95vh] !p-0 !rounded-lg !flex !flex-col !grid-cols-none !gap-0">
        {/* Builder Mode - Full Screen Builder */}
        {watchedValues.sendFormat === EmailSendFormat.HTML && useBuilder ? (
          <>
            <DialogHeader className="p-4 pr-12 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <DialogTitle>
                    {isViewMode ? "View Email Template" : template ? "Edit Email Template" : "Create Email Template"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {isViewMode 
                      ? "View email template details" 
                      : template 
                        ? "Edit your email template content and settings" 
                        : "Create a new email template for your campaigns"}
                  </DialogDescription>
                </div>
                 <div className="flex items-center gap-2">
                   <Label htmlFor="builder-toggle-header" className="text-xs text-muted-foreground cursor-pointer">
                     Builder Mode
                   </Label>
                   <Switch
                     id="builder-toggle-header"
                     checked={useBuilder}
                     onCheckedChange={(checked) => {
                       setUseBuilder(checked);
                       if (!checked && builderData) {
                         // When disabling builder, save the HTML content back to form
                         const html = builderToHtml(builderData);
                         setValue("htmlContent", html, { shouldDirty: true, shouldValidate: true });
                       }
                     }}
                     disabled={isViewMode}
                   />
                 </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <EmailTemplateBuilder
                initialData={builderData || undefined}
                onHtmlChange={(html) => {
                  setValue("htmlContent", html, { shouldDirty: true, shouldValidate: true });
                }}
                onDataChange={(data) => {
                  setBuilderData(data);
                }}
                previewData={DEFAULT_PREVIEW_CONTACT_DATA}
                onSaveContent={(html, data) => {
                  // Save HTML content and builder data
                  setValue("htmlContent", html, { shouldDirty: true, shouldValidate: true });
                  setBuilderData(data);
                  // Disable builder mode to show preview
                  setUseBuilder(false);
                  toast.success("Content saved! Fill in title and subject, then save the template.");
                }}
              />
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="p-4 border-b flex-shrink-0">
              <DialogTitle>
                {isViewMode ? "View Email Template" : template ? "Edit Email Template" : "Create Email Template"}
              </DialogTitle>
              <DialogDescription>
                {isViewMode 
                  ? "View email template details" 
                  : template 
                    ? "Edit your email template content and settings" 
                    : "Create a new email template for your campaigns"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel - 60% - scrollable */}
          <div className="w-[60%] flex flex-col min-h-0 overflow-y-auto p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
              {/* Predefined Style and Title - 2 Columns */}
              <div className={`grid gap-4 mb-4 ${!template && !isViewMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {!template && !isViewMode && (
                  <div className="flex flex-col">
                    <Label htmlFor="systemTemplate" className="text-sm font-medium text-foreground">
                      Predefined Style (Optional)
                    </Label>
                    <Select
                      value={selectedSystemTemplateId || 'none'}
                      onValueChange={handleSystemTemplateSelect}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Select a predefined template style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Start from scratch</SelectItem>
                        {systemTemplates.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.name} {st.category ? `(${st.category})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex flex-col">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Title
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter template title"
                    className="mt-1 w-full"
                    disabled={isViewMode}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                  )}
                </div>
              </div>

              {/* Category, Visibility, and Send Format - 3 Columns */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex flex-col">
                  <Label htmlFor="category" className="text-sm font-medium text-foreground">
                    Category
                  </Label>
                  <Select
                    value={watchedValues.category || undefined}
                    onValueChange={(value) => setValue("category", value || undefined)}
                    disabled={isViewMode}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Welcome</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="thank-you">Thank You</SelectItem>
                      <SelectItem value="invitation">Invitation</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="re-engagement">Re-engagement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="type" className="text-sm font-medium text-foreground">
                    Visibility
                  </Label>
                  <Select
                    value={watchedValues.type || EmailTemplateType.PRIVATE}
                    onValueChange={(value) => setValue("type", value as EmailTemplateType)}
                    disabled={isViewMode}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue>
                        {watchedValues.type === EmailTemplateType.PUBLIC ? "Public" : "Private"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EmailTemplateType.PRIVATE}>Private</SelectItem>
                      <SelectItem value={EmailTemplateType.PUBLIC}>Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="sendFormat" className="text-sm font-medium text-foreground">
                    Send Format
                  </Label>
                  <Select
                    value={watchedValues.sendFormat || EmailSendFormat.TEXT}
                    onValueChange={(value) => {
                      const newFormat = value as EmailSendFormat;
                      setValue("sendFormat", newFormat, { shouldDirty: true, shouldValidate: true });
                      // Track if user manually set to HTML
                      if (newFormat === EmailSendFormat.HTML) {
                        setUserManuallySetHtml(true);
                      } else {
                        setUserManuallySetHtml(false);
                      }
                    }}
                    disabled={isViewMode}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue>
                        {watchedValues.sendFormat === EmailSendFormat.HTML ? "HTML" : "Text"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EmailSendFormat.HTML}>HTML</SelectItem>
                      <SelectItem value={EmailSendFormat.TEXT}>Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject Field */}
              <div className="mb-4">
                <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                  Subject
                </Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="subject"
                    {...register("subject")}
                    placeholder="Enter email subject"
                    className="flex-1"
                    disabled={isViewMode}
                  />
                  <VariablePicker
                    variables={[
                      'firstName',
                      'lastName',
                      'email',
                      'company',
                      'position',
                      'phone',
                      'website'
                    ]}
                    onInsert={handleVariableInsert}
                    disabled={isViewMode}
                  />
                </div>
                {errors.subject && (
                  <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
                )}
              </div>

              {/* Content Editor */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-foreground">
                    Content
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="builder-toggle" className="text-xs text-muted-foreground cursor-pointer">
                      Use Builder
                    </Label>
                    <Switch
                      id="builder-toggle"
                      checked={useBuilder}
                      onCheckedChange={(checked) => {
                        setUseBuilder(checked);
                        if (checked) {
                          // When enabling builder, set sendFormat to HTML if not already
                          if (watchedValues.sendFormat !== EmailSendFormat.HTML) {
                            setValue("sendFormat", EmailSendFormat.HTML, { shouldDirty: true, shouldValidate: true });
                          }
                          // Initialize builder data if not exists
                          if (!builderData) {
                            const htmlContent = watchedValues.htmlContent || '';
                            if (htmlContent) {
                              try {
                                const converted = htmlToBuilder(htmlContent);
                                setBuilderData(converted);
                              } catch (e) {
                                setBuilderData({ mode: 'builder', elements: [] });
                              }
                            } else {
                              setBuilderData({ mode: 'builder', elements: [] });
                            }
                          }
                        }
                      }}
                      disabled={isViewMode}
                    />
                  </div>
                </div>
                <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
                  {watchedValues.sendFormat === EmailSendFormat.HTML ? (
                    <Textarea
                      value={watchedValues.htmlContent || ''}
                      onChange={(e) => {
                        setValue("htmlContent", e.target.value, { shouldDirty: true, shouldValidate: true });
                      }}
                      placeholder="Enter HTML content here..."
                      disabled={isViewMode}
                      className="h-full min-h-[300px] font-mono text-sm resize-none"
                      style={{ fontFamily: 'monospace' }}
                    />
                  ) : (
                    <div className="h-full min-h-[300px]">
                      <TiptapEditor
                        value={watchedValues.textContent ? watchedValues.textContent.replace(/\n/g, '<br>') : ''}
                        onChange={(htmlContent) => {
                          // For TEXT format:
                          // - textContent: TipTap HTML conversion (for sending with links)
                          // - plainText: Plain text with line breaks (for preview)
                          // - htmlContent: Don't change (preserve if exists from system templates)
                          
                          // Convert TipTap HTML to plain text with line breaks
                          let plainText = htmlContent
                            .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, (match, url, text) => {
                              const linkText = text.trim() || url;
                              return linkText === url ? url : `${linkText} (${url})`;
                            })
                            .replace(/<br\s*\/?>/gi, '\n')
                            .replace(/<\/p>/gi, '\n')
                            .replace(/<p[^>]*>/gi, '')
                            .replace(/<\/div>/gi, '\n')
                            .replace(/<div[^>]*>/gi, '')
                            .replace(/<[^>]+>/g, '')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                          
                          // textContent: TipTap HTML (for sending)
                          setValue("textContent", htmlContent, { shouldDirty: true, shouldValidate: true });
                          // plainText: Plain text with line breaks (for preview)
                          setValue("plainText", plainText, { shouldDirty: true, shouldValidate: true });
                          // htmlContent: Don't change (preserve if exists from system templates)
                        }}
                        placeholder="Enter plain text content here. URLs will be automatically converted to links..."
                        disabled={isViewMode}
                      />
                    </div>
                  )}
                </div>
                {(errors.htmlContent || errors.textContent) && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.htmlContent?.message || errors.textContent?.message || "Either HTML content or text content is required"}
                  </p>
                )}
              </div>

              {/* Footer */}
              {!isViewMode && (
                <div className="flex justify-end pt-4 mt-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    title={!isFormValid ? "Please fill in title, subject, and content" : ""}
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Right Panel - 40% */}
          <div className="w-[40%] border-l border-border flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="text-sm font-medium text-foreground">Email Preview</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Email Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{watchedValues.subject?.length || 0} chars</span>
                    <span>
                      {(watchedValues.htmlContent || watchedValues.textContent || '').split(/\s+/).filter(w => w.length > 0).length || 0} words
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 border border-border rounded-lg min-h-[200px] overflow-y-auto">
                  {watchedValues.subject || watchedValues.htmlContent || watchedValues.textContent ? (
                    <div className="space-y-3">
                      {/* Subject */}
                      <div>
                        <div className="text-sm font-medium text-foreground break-words">
                          {watchedValues.subject ? replaceVariables(watchedValues.subject) : <span className="text-muted-foreground italic">No subject</span>}
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="border-t border-border"></div>
                      
                      {/* Content */}
                      <div className="break-words">
                        {watchedValues.sendFormat === EmailSendFormat.HTML && watchedValues.htmlContent ? (
                          /* HTML format - render HTML content */
                          <EmailPreviewContent htmlContent={replaceVariables(watchedValues.htmlContent || '')} />
                        ) : watchedValues.sendFormat === EmailSendFormat.TEXT ? (
                          /* Text format - show plain text preview with line breaks */
                          (() => {
                            // Get plain text content - prefer plainText (with line breaks), fallback to textContent or converted htmlContent
                            let plainText = watchedValues.plainText || watchedValues.textContent || '';
                            if (!plainText && watchedValues.htmlContent) {
                              // Convert HTML to plain text for preview
                              plainText = convertHtmlToText(watchedValues.htmlContent);
                            }
                            return (
                              <div
                                className="text-foreground text-xs"
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'Inter, sans-serif',
                                  lineHeight: '1.6',
                                }}
                              >
                                {plainText ? replaceVariables(plainText) : <span className="text-muted-foreground italic">No content</span>}
                              </div>
                            );
                          })()
                        ) : watchedValues.textContent ? (
                          /* Fallback: show text content if available */
                          <div
                            className="text-foreground text-xs"
                            style={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'Inter, sans-serif',
                              lineHeight: '1.6',
                            }}
                          >
                            {replaceVariables(watchedValues.textContent)}
                          </div>
                        ) : watchedValues.htmlContent ? (
                          /* Fallback: if no textContent but htmlContent exists, show HTML */
                          <EmailPreviewContent htmlContent={replaceVariables(watchedValues.htmlContent || '')} />
                        ) : (
                          <span className="text-muted-foreground italic">No content</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                      <p className="text-sm text-muted-foreground italic">Enter subject and content to preview</p>
                    </div>
                  )}
                </div>
                
                {/* Validation Messages */}
                {(watchedValues.subject || watchedValues.htmlContent) && (
                  <div className="space-y-1">
                    {watchedValues.subject && (
                      <div className="text-xs text-muted-foreground">
                        Subject: {watchedValues.subject.length < 30 ? 'Too short (30-60 recommended)' : 
                         watchedValues.subject.length > 60 ? 'Too long (30-60 recommended)' : 
                         'Good length'}
                      </div>
                    )}
                    {watchedValues.htmlContent && (
                      <div className="text-xs text-muted-foreground">
                        Content: {watchedValues.htmlContent.split(/\s+/).length < 50 ? 'Too short (50-200 recommended)' : 
                         watchedValues.htmlContent.split(/\s+/).length > 200 ? 'Too long (50-200 recommended)' : 
                         'Good length'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Personalization Tips */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Personalization Tips</span>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 bg-muted/30 border border-border rounded">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Use variables like {`{{firstName}}`} to personalize your emails
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted/30 border border-border rounded">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Keep subject lines between 30-60 characters for better open rates
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted/30 border border-border rounded">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Aim for 50-200 words in your email content
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
