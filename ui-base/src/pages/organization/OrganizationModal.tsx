"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/api/organizationTypes";
import {
  OrganizationStatus,
  OrganizationStatusLabels,
  CommonTimezones,
} from "@/api/organizationTypes";
import { organizationService } from "@/api/organizationService";

/**
 * Generates a random organization name following cloud resource naming patterns
 * Format: {prefix}-{adjective}-{identifier}
 * Similar to cloud resource names like: org-apex-abc123, company-quantum-001
 */
function generateRandomOrgName(): string {
  // Organization and company-related prefixes
  const prefixes = [
    'org', 'company', 'corp', 'enterprise', 'business', 'firm', 'group',
    'holdings', 'ventures', 'partners', 'associates', 'alliance', 'collective',
    'network', 'syndicate', 'consortium', 'conglomerate', 'establishment',
    'institution', 'foundation', 'organization', 'corporation', 'entity'
  ];

  // 50+ unique and dashing adjectives (all unique, no duplicates)
  const adjectives = [
    // Power & Excellence
    'apex', 'quantum', 'nexus', 'velocity', 'synergy', 'catalyst', 'pinnacle',
    'horizon', 'summit', 'vortex', 'momentum', 'zenith', 'aurora', 'nova',
    'stellar', 'dynamic', 'elite', 'prime', 'core', 'vertex', 'fusion',
    'genesis', 'pulse', 'echo', 'phoenix', 'titan', 'vanguard', 'frontier',
    'odyssey', 'legacy', 'thunder', 'blaze', 'storm',
    // Precious Materials
    'titanium', 'platinum', 'diamond', 'crystal', 'silver', 'gold', 'iron',
    'steel', 'magnum', 'imperial', 'royal', 'crown',
    // Gemstones & Minerals
    'emerald', 'sapphire', 'ruby', 'onyx', 'jade', 'amber', 'ivory', 'pearl',
    'coral', 'topaz', 'garnet', 'obsidian', 'marble', 'granite', 'basalt',
    'quartz', 'opal', 'agate', 'citrine', 'amethyst', 'peridot', 'zircon',
    'tourmaline', 'spinel', 'tanzanite', 'alexandrite', 'moonstone', 'sunstone',
    'labradorite', 'malachite', 'turquoise', 'lapis', 'carnelian', 'jasper',
    // Cosmic & Celestial
    'eclipse', 'comet', 'nebula', 'cosmic', 'lunar', 'solar', 'galactic',
    'celestial', 'meteor', 'asteroid', 'constellation', 'supernova', 'pulsar',
    'quasar', 'singularity', 'infinity', 'eternity',
    // Transformation & Evolution
    'transcend', 'ascend', 'evolve', 'transform', 'revolution', 'renaissance',
    'revelation', 'enlightenment',
    'rebirth', 'reformation'
  ];

  // Generate random identifier (alphanumeric, 4-6 characters)
  const generateIdentifier = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * 3) + 4; // 4-6 characters
    let identifier = '';
    for (let i = 0; i < length; i++) {
      identifier += chars[Math.floor(Math.random() * chars.length)];
    }
    return identifier;
  };

  // Get random components
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const identifier = generateIdentifier();

  // Format: prefix-adjective-identifier (cloud resource style)
  return `${prefix}-${adjective}-${identifier}`;
}

// Form validation schema - ALIGNED WITH SERVER
const organizationFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be less than 255 characters"),
  slug: z
    .string()
    .refine(
      (val) => {
        // Allow empty string (will be auto-generated)
        if (!val || val === "") return true;
        // If provided, validate it
        return val.length >= 2 && val.length <= 100 && /^[a-z0-9-]+$/.test(val);
      },
      {
        message: "Slug must be 2-100 characters and contain only lowercase letters, numbers, and hyphens"
      }
    )
    .optional()
    .or(z.literal("")),
  domain: z
    .string()
    .max(255, "Domain must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required"),
  billingEmail: z
    .string()
    .min(1, "Billing email is required")
    .email("Invalid email address"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  website: z
    .union([z.string().url("Invalid website URL"), z.literal("")])
    .optional(),
  logoUrl: z
    .union([z.string().url("Invalid logo URL"), z.literal("")])
    .optional(),
  address: z
    .string()
    .max(255, "Address must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "City must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "State must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .max(100, "Country must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  postalCode: z
    .string()
    .max(20, "Postal code must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  phone: z
    .union([
      z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number must be less than 20 digits"),
      z.literal("")
    ])
    .optional(),
  email: z
    .union([z.string().email("Invalid email address"), z.literal("")])
    .optional(),
  status: z.nativeEnum(OrganizationStatus),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

export interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: Organization | null;
  onSuccess: () => void;
  isReadOnly?: boolean;
  userOrganizationId?: string;
}

export default function OrganizationModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
  isReadOnly = false,
  userOrganizationId,
}: OrganizationModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      slug: undefined,
      domain: "",
      timezone: "UTC",
      billingEmail: "",
      description: "",
      website: "",
      logoUrl: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      phone: "",
      email: "",
      status: OrganizationStatus.ACTIVE,
    },
  });

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain || "",
        timezone: organization.timezone || "UTC",
        billingEmail: organization.billingEmail || "",
        description: organization.description || "",
        website: organization.website || "",
        logoUrl: organization.logoUrl || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        country: organization.country || "",
        postalCode: organization.postalCode || "",
        phone: organization.phone || "",
        email: organization.email || "",
        status: organization.status,
      });
    } else {
      form.reset({
        name: "",
        slug: "",
        domain: "",
        timezone: "UTC",
        billingEmail: "",
        description: "",
        website: "",
        logoUrl: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        phone: "",
        email: "",
        status: OrganizationStatus.ACTIVE,
      });
    }
  }, [organization, form]);

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      setLoading(true);

      // Clean up empty strings
      const cleanedData = {
        ...data,
        slug: data.slug || undefined, // Slug is optional, will be auto-generated if not provided
        domain: data.domain || undefined,
        // billingEmail is required, keep it as is
        description: data.description || undefined,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        postalCode: data.postalCode || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        status: data.status, // Include status field in API call
      };

      console.log("Submitting organization data:", cleanedData);
      console.log("Form validation state:", form.formState);

      let response;
      if (organization) {
        response = await organizationService.updateOrganization(
          organization.id,
          cleanedData,
          userOrganizationId
        );
      } else {
        response = await organizationService.createOrganization(cleanedData);
      }

      if (response.success) {
        toast.success(
          organization
            ? "Organization updated successfully"
            : "Organization created successfully"
        );
        onSuccess();
        onClose();
      } else {
        toast.error(
          response.message ||
            (organization
              ? "Failed to update organization"
              : "Failed to create organization")
        );
      }
    } catch (error: any) {
      // Check if error is a timeout
      const isTimeout = error?.name === 'TimeoutError' || 
        error?.message?.includes('timeout') || 
        error?.message?.includes('aborted') ||
        error?.message?.includes('signal');
      
      if (isTimeout && !organization) {
        // For timeout during creation, suggest checking if it was created
        toast.warning(
          "Request timed out. The organization may have been created. Please refresh the page to verify.",
          { duration: 5000 }
        );
        // Still call onSuccess to refresh the list in case it was created
        onSuccess();
      } else {
        const errorMessage =
          error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          "An error occurred while saving the organization";
        toast.error(errorMessage);
      }
      console.error("Organization save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {organization
              ? isReadOnly
                ? "View Organization"
                : "Edit Organization"
              : "Create New Organization"}
          </DialogTitle>
          <DialogDescription>
            {organization
              ? isReadOnly
                ? "View organization details and information"
                : "Update organization information and settings"
              : "Add a new organization to the system"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(
              onSubmit,
              (errors) => {
                console.error("Form validation errors:", errors);
                toast.error("Please fix the form errors before submitting");
              }
            )} 
            className="space-y-4"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter organization name"
                          {...field}
                          disabled={isReadOnly}
                          className="flex-1"
                        />
                        {!organization && !isReadOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const generatedName = generateRandomOrgName();
                              form.setValue("name", generatedName);
                            }}
                            title="Generate random organization name"
                            className="flex-shrink-0"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />

              {/* Slug field - only shown for existing organizations (read-only) */}
              {organization && (
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="org-slug"
                          {...field}
                          disabled={true}
                          className="lowercase"
                        />
                      </FormControl>
                      <FormDescription>
                        Slug is auto-generated and cannot be changed
                      </FormDescription>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="example.com"
                        {...field}
                        disabled={isReadOnly || !!organization}
                      />
                    </FormControl>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isReadOnly || !!organization}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OrganizationStatusLabels).map(
                          ([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              className="cursor-pointer"
                            >
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter organization description"
                      {...field}
                      disabled={isReadOnly}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@organization.com"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />
            </div>

            {/* Website and Logo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://www.organization.com"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    {!isReadOnly && <FormMessage />}
                  </FormItem>
                )}
              />
            </div>

            {/* Address Fields */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main Street"
                      {...field}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="State"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Country"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subscription and Settings */}
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isReadOnly}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CommonTimezones.map((timezone) => (
                        <SelectItem
                          key={timezone}
                          value={timezone}
                          className="cursor-pointer"
                        >
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isReadOnly && <FormMessage />}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="billing@organization.com"
                      {...field}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  {!isReadOnly && <FormMessage />}
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="cursor-pointer"
                disabled={loading}
              >
                Cancel
              </Button>
              {!isReadOnly && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {organization ? "Update Organization" : "Create Organization"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
