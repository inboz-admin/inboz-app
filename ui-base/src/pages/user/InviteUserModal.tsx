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
import { toast } from "sonner";
import { userService } from "@/api/userService";
import { subscriptionService } from "@/api/subscriptionService";
import { organizationService } from "@/api/organizationService";
import { PlanLimitWarningDialog } from "@/components/plan-limit-warning-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { Organization } from "@/api/organizationTypes";

// Schema for invite user form validation - blocks Gmail, allows any Google Workspace
const createInviteUserFormSchema = (isEmployee: boolean) => z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      (email) => {
        const domain = email.split("@")[1]?.toLowerCase();
        // Block personal Gmail accounts, allow any other domain (Google Workspace)
        return domain !== "gmail.com";
      },
      "Personal Gmail accounts are not supported. Please use a Google Workspace email (e.g., yourname@yourcompany.com)."
    ),
  organizationId: isEmployee
    ? z.string().min(1, "Organization is required")
    : z.string().optional(),
});

type InviteUserFormData = z.infer<ReturnType<typeof createInviteUserFormSchema>>;

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userOrganizationId?: string;
  allowedDomain?: string;
}

export default function InviteUserModal({
  isOpen,
  onClose,
  onSuccess,
  userOrganizationId,
  allowedDomain,
}: InviteUserModalProps) {
  const { user } = useAppStore();
  const isEmployee = user?.type === "employee";
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitWarningOpen, setLimitWarningOpen] = useState(false);
  const [limitWarningData, setLimitWarningData] = useState<{
    currentCount: number;
    maxLimit: number;
    planName: string;
    subscriptionId?: string;
  } | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  const formSchema = createInviteUserFormSchema(isEmployee);
  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      organizationId: isEmployee ? "" : userOrganizationId || "",
    },
  });

  // Fetch organizations for employees
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (isOpen && isEmployee) {
        try {
          setLoadingOrganizations(true);
          const response = await organizationService.getOrganizations({
            page: 1,
            limit: 1000, // Get all organizations
            status: "ACTIVE", // Only show active organizations
          });

          if (response.success && response.data) {
            setOrganizations(response.data.data);
          } else {
            setOrganizations([]);
          }
        } catch (error) {
          console.error("Error fetching organizations:", error);
          setOrganizations([]);
          toast.error("Failed to load organizations");
        } finally {
          setLoadingOrganizations(false);
        }
      }
    };

    fetchOrganizations();
  }, [isOpen, isEmployee]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        email: "",
        organizationId: isEmployee ? "" : userOrganizationId || "",
      });
    }
  }, [isOpen, form, isEmployee, userOrganizationId]);

  // Watch organizationId for employees
  const selectedOrgId = form.watch("organizationId");

  // Check trial status when modal opens or organization changes
  useEffect(() => {
    const checkTrialStatus = async () => {
      const orgId = isEmployee 
        ? selectedOrgId 
        : userOrganizationId;
      
      if (isOpen && orgId) {
        try {
          const response = await subscriptionService.getTrialStatus(orgId);
          if (response.success && response.data) {
            setIsTrial(response.data.isTrial && !response.data.isExpired);
            setTrialDaysRemaining(response.data.daysRemaining);
          }
        } catch (error) {
          console.error("Error checking trial status:", error);
        }
      } else {
        setIsTrial(false);
        setTrialDaysRemaining(null);
      }
    };

    checkTrialStatus();
  }, [isOpen, userOrganizationId, isEmployee, selectedOrgId]);

  const onSubmit = async (data: InviteUserFormData) => {
    try {
      setIsSubmitting(true);

      // For employees, use selected organizationId from form
      // For regular users, use userOrganizationId prop
      const orgId = isEmployee 
        ? data.organizationId 
        : userOrganizationId || "";

      if (!orgId) {
        toast.error("Organization is required");
        setIsSubmitting(false);
        return;
      }

      const response = await userService.inviteUser({
        email: data.email,
        organizationId: orgId,
      });

      if (response.success) {
        toast.success("Invitation sent successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || "Failed to send invitation");
      }
    } catch (error: any) {
      // Check if error is a plan limit exceeded error
      const errorData = error?.response?.data || error?.data;
      if (errorData?.limitExceeded && errorData?.limitType === "users") {
        setLimitWarningData({
          currentCount: errorData.currentCount || 0,
          maxLimit: errorData.maxLimit || 0,
          planName: errorData.planName || "Current Plan",
          subscriptionId: errorData.subscriptionId,
        });
        setLimitWarningOpen(true);
      } else {
        toast.error(
          errorData?.message ||
            error?.message ||
            "An error occurred while sending the invitation"
        );
      }
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new user. They will receive an email with
            instructions to join your organization.
          </DialogDescription>
        </DialogHeader>

        {isTrial && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You're on a free trial. Invitations are free during the trial period.{trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                <> {Math.ceil(trialDaysRemaining)} {Math.ceil(trialDaysRemaining) === 1 ? "day" : "days"} remaining in your trial.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isEmployee && (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingOrganizations || isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select organization">
                            {field.value
                              ? organizations.find((org) => org.id === field.value)?.name
                              : "Select organization"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingOrganizations ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Loading organizations...
                          </div>
                        ) : organizations.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No organizations found
                          </div>
                        ) : (
                          organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Any Google Workspace email is allowed. Personal Gmail accounts (@gmail.com) are not supported.
                  </p>
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
                onClick={() => {
                  form.handleSubmit(onSubmit)();
                }}
              >
                {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Plan Limit Warning Dialog */}
      {limitWarningData && (
        <PlanLimitWarningDialog
          isOpen={limitWarningOpen}
          onClose={() => setLimitWarningOpen(false)}
          limitType="users"
          currentCount={limitWarningData.currentCount}
          maxLimit={limitWarningData.maxLimit}
          planName={limitWarningData.planName}
          subscriptionId={limitWarningData.subscriptionId}
          onUpgrade={() => {
            setLimitWarningOpen(false);
            // Navigate to subscription detail page if subscriptionId is available
            if (limitWarningData.subscriptionId) {
              window.location.href = `/dashboard/subscriptions/${limitWarningData.subscriptionId}`;
            } else {
              // Fallback to subscriptions list page
              window.location.href = "/dashboard/subscriptions";
            }
          }}
        />
      )}
    </Dialog>
  );
}
