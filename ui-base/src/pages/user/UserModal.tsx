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
import { Textarea } from "@/components/ui/textarea";
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/api/userTypes";
import {
  UserRole,
  UserStatus,
  UserRoleLabels,
  UserStatusLabels,
} from "@/api/userTypes";
import { toast } from "sonner";
import { userService } from "@/api/userService";

// Simplified Zod schema for user form validation
const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  avatarUrl: z.string().optional(),
  organizationId: z.string().min(1, "Organization is required"),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSuccess: () => void;
  isReadOnly?: boolean;
  userOrganizationId?: string;
}

export default function UserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  isReadOnly = false,
  userOrganizationId,
}: UserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!user && !isReadOnly;

  const form = useForm<UserFormData>({
    resolver: isReadOnly ? undefined : zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      avatarUrl: "",
      organizationId: "",
    },
  });

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        // Editing existing user
        form.reset({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl || "",
          organizationId: user.organizationId,
        });
      } else {
        // Adding new user
        form.reset({
          firstName: "",
          lastName: "",
          email: "",
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          avatarUrl: "",
          organizationId: userOrganizationId || "",
        });
      }
    }
  }, [isOpen, user, form, userOrganizationId]);

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true);

      // Clean up empty strings and convert to proper types
      const cleanData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        status: data.status,
        avatarUrl: data.avatarUrl || undefined,
        organizationId: data.organizationId,
      };

      if (isEditing && user) {
        // Update existing user
        const updateData: UpdateUserRequest = cleanData;

        const response = await userService.updateUser(
          user.id,
          updateData,
          userOrganizationId
        );

        if (response.success) {
          toast.success("User updated successfully");
          onSuccess();
          onClose();
        } else {
          // Show specific error message from API response
          toast.error(response.message || "Failed to update user");
          // Modal stays open on error
        }
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          ...cleanData,
        };

        const response = await userService.createUser(createData);

        if (response.success) {
          toast.success("User created successfully");
          onSuccess();
          onClose();
        } else {
          // Show specific error message from API response
          toast.error(response.message || "Failed to create user");
          // Modal stays open on error
        }
      }
    } catch {
      toast.error("An error occurred while saving the user");
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
              ? "User Details"
              : isEditing
              ? "Edit User"
              : "Add New User"}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "View user information below."
              : isEditing
              ? "Update the user information below."
              : "Fill in the details to create a new user."}
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
                    <FormLabel>First Name *</FormLabel>
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
                    <FormLabel>Last Name *</FormLabel>
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
                      readOnly={isReadOnly || isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(UserRoleLabels)
                          .filter(([value]) => value !== UserRole.SUPERADMIN)
                          .map(([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              className="cursor-pointer"
                            >
                              {label}
                            </SelectItem>
                          ))}
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
                        {Object.entries(UserStatusLabels).map(
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
            </div>

            {/* Additional Information - Only for create mode and not read-only */}
            {!isEditing && !isReadOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>

                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter avatar URL"
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
                  name="organizationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter organization ID"
                          {...field}
                          readOnly={isReadOnly || !!userOrganizationId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                    ? "Update User"
                    : "Create User"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
