"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
} from "@/api/contactTypes";
import {
  ContactStatus,
  ContactStatusLabels,
  ContactSourceLabels,
} from "@/api/contactTypes";
import { toast } from "sonner";
import { contactService } from "@/api/contactService";
import { PlanLimitWarningDialog } from "@/components/plan-limit-warning-dialog";

// Simplified Zod schema for contact form validation
const contactFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().optional(),
  status: z.nativeEnum(ContactStatus),
  organizationId: z.string().min(1, "Organization is required"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact | null;
  onSuccess: () => void;
  isReadOnly?: boolean;
  userOrganizationId?: string;
}

export default function ContactModal({
  isOpen,
  onClose,
  contact,
  onSuccess,
  isReadOnly = false,
  userOrganizationId,
}: ContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitWarningOpen, setLimitWarningOpen] = useState(false);
  const [limitWarningData, setLimitWarningData] = useState<{
    currentCount: number;
    maxLimit: number;
    planName: string;
  } | null>(null);
  const isEditing = !!contact && !isReadOnly;

  const form = useForm<ContactFormData>({
    resolver: isReadOnly ? undefined : zodResolver(contactFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      jobTitle: "",
      source: "MANUAL",
      status: ContactStatus.ACTIVE,
      organizationId: "",
    },
  });

  // Reset form when modal opens/closes or contact changes
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        // Editing existing contact
        form.reset({
          email: contact.email,
          firstName: contact.firstName || "",
          lastName: contact.lastName || "",
          company: contact.company || "",
          jobTitle: contact.jobTitle || "",
          source: contact.source ? contact.source.toUpperCase() : "MANUAL",
          status: contact.status,
          organizationId: contact.organizationId,
        });
      } else {
        // Adding new contact
        form.reset({
          email: "",
          firstName: "",
          lastName: "",
          company: "",
          jobTitle: "",
          source: "MANUAL",
          status: ContactStatus.ACTIVE,
          organizationId: userOrganizationId || "",
        });
      }
    }
  }, [isOpen, contact, form, userOrganizationId]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      setIsSubmitting(true);

      // Clean up empty strings and convert to proper types
      const cleanData = {
        email: data.email,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        company: data.company || undefined,
        jobTitle: data.jobTitle || undefined,
        source: data.source ? data.source.toUpperCase() : "MANUAL",
        status: data.status,
        organizationId: data.organizationId,
      };

      if (isEditing && contact) {
        // Update existing contact
        const updateData: UpdateContactRequest = cleanData;

        const response = await contactService.updateContact(
          contact.id,
          updateData,
          userOrganizationId
        );

        if (response.success) {
          toast.success("Contact updated successfully");
          onSuccess();
          onClose();
        } else {
          // Show specific error message from API response
          toast.error(response.message || "Failed to update contact");
          // Modal stays open on error
        }
      } else {
        // Create new contact
        const createData: CreateContactRequest = {
          ...cleanData,
        };

        const response = await contactService.createContact(createData);

        if (response.success) {
          toast.success("Contact created successfully");
          onSuccess();
          onClose();
        } else {
          // Show specific error message from API response
          toast.error(response.message || "Failed to create contact");
          // Modal stays open on error
        }
      }
    } catch (error: any) {
      // Check if error is a plan limit exceeded error
      const errorData = error?.response?.data || error?.data;
      if (errorData?.limitExceeded && errorData?.limitType === "contacts") {
        setLimitWarningData({
          currentCount: errorData.currentCount || 0,
          maxLimit: errorData.maxLimit || 0,
          planName: errorData.planName || "Current Plan",
        });
        setLimitWarningOpen(true);
      } else {
        toast.error(
          errorData?.message ||
            error?.message ||
            "An error occurred while saving the contact"
        );
      }
      // Modal stays open on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly
              ? "Contact Details"
              : isEditing
              ? "Edit Contact"
              : "Add New Contact"}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "View contact information below."
              : isEditing
              ? "Update the contact information below."
              : "Fill in the details to create a new contact."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter first name"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter last name"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                      readOnly={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter company name"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter job title"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isReadOnly}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Select source">
                          {field.value
                            ? ContactSourceLabels[field.value.toUpperCase()] ||
                              field.value
                            : "Select source"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ContactSourceLabels).map(
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
                  <FormMessage />
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
                    disabled={isReadOnly}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ContactStatusLabels).map(
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isReadOnly ? "Close" : "Cancel"}
              </Button>
              {!isReadOnly && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer"
                  onClick={() => {
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  {isSubmitting
                    ? isEditing
                      ? "Updating..."
                      : "Creating..."
                    : isEditing
                    ? "Update Contact"
                    : "Create Contact"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Plan Limit Warning Dialog */}
      {limitWarningData && (
        <PlanLimitWarningDialog
          isOpen={limitWarningOpen}
          onClose={() => setLimitWarningOpen(false)}
          limitType="contacts"
          currentCount={limitWarningData.currentCount}
          maxLimit={limitWarningData.maxLimit}
          planName={limitWarningData.planName}
          onUpgrade={() => {
            setLimitWarningOpen(false);
            // Navigate to subscriptions page or open upgrade modal
            window.location.href = "/subscriptions";
          }}
        />
      )}
    </Dialog>
  );
}
