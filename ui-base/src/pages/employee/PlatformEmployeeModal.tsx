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
import type { PlatformEmployee } from "@/api";
import {
  PlatformEmployeeRole,
  PlatformEmployeeStatus,
  PlatformEmployeeRoleLabels,
  PlatformEmployeeStatusLabels,
} from "@/api";
import { toast } from "sonner";
import { platformEmployeeService } from "@/api";

// Simplified Zod schema for employee form validation
const employeeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(PlatformEmployeeRole),
  status: z.nativeEnum(PlatformEmployeeStatus),
  password: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface PlatformEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: PlatformEmployee | null;
  onSuccess: () => void;
  isReadOnly?: boolean;
}

export default function PlatformEmployeeModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
  isReadOnly = false,
}: PlatformEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!employee && !isReadOnly;

  const form = useForm<EmployeeFormData>({
    resolver: isReadOnly ? undefined : zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: PlatformEmployeeRole.SUPPORT,
      status: PlatformEmployeeStatus.ACTIVE,
      password: "",
    },
  });

  // Reset form when modal opens/closes or employee changes
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        // Editing existing employee
        form.reset({
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          email: employee.email,
          role: employee.role as PlatformEmployeeRole,
          status: employee.status as PlatformEmployeeStatus,
          password: "", // Don't pre-fill password
        });
      } else {
        // Adding new employee
        form.reset({
          firstName: "",
          lastName: "",
          email: "",
          role: PlatformEmployeeRole.SUPPORT,
          status: PlatformEmployeeStatus.ACTIVE,
          password: "",
        });
      }
    }
  }, [isOpen, employee, form]);

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setIsSubmitting(true);

      // Clean up empty strings
      const cleanData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        status: data.status,
      };

      // Only include password if provided (for create or if updating)
      if (data.password && data.password.length > 0) {
        cleanData.password = data.password;
      }

      if (isEditing && employee) {
        // Update existing employee
        const response = await platformEmployeeService.updateEmployee(
          employee.id,
          cleanData
        );

        if (response.success) {
          toast.success("Employee updated successfully");
          onSuccess();
          onClose();
        } else {
          toast.error(response.message || "Failed to update employee");
        }
      } else {
        // Create new employee - password is optional (will be auto-generated if not provided)
        const response = await platformEmployeeService.createEmployee({
          ...cleanData,
          password: data.password && data.password.length > 0 ? data.password : undefined,
        });

        if (response.success) {
          toast.success("Employee created successfully");
          onSuccess();
          onClose();
        } else {
          toast.error(response.message || "Failed to create employee");
        }
      }
    } catch {
      toast.error("An error occurred while saving the employee");
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
              ? "Employee Details"
              : isEditing
              ? "Edit Employee"
              : "Add New Employee"}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "View employee information below."
              : isEditing
              ? "Update the employee information below."
              : "Fill in the details to create a new platform employee."}
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
                        {Object.entries(PlatformEmployeeRoleLabels).map(
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
                        {Object.entries(PlatformEmployeeStatusLabels).map(
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

            {/* Password field - only for create or if editing */}
            {!isReadOnly && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave blank to auto-generate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {!isEditing && (
                      <p className="text-sm text-muted-foreground">
                        Auto-generated password will be sent via email
                      </p>
                    )}
                  </FormItem>
                )}
              />
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
                >
                  {isSubmitting
                    ? isEditing
                      ? "Updating..."
                      : "Creating..."
                    : isEditing
                    ? "Update Employee"
                    : "Create Employee"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

