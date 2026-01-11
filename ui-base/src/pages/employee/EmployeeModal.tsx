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
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "@/api/employeeTypes";
import {
  EmployeeRole,
  EmployeeStatus,
  EmployeeRoleLabels,
  EmployeeStatusLabels,
} from "@/api/employeeTypes";
import { toast } from "sonner";
import { employeeService } from "@/api/employeeService";

// Simplified Zod schema for employee form validation
const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(EmployeeRole),
  status: z.nativeEnum(EmployeeStatus),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  qualifications: z.string().optional(),
  salary: z.string().optional(),
  description: z.string().optional(),
  centerId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSuccess: () => void;
  isReadOnly?: boolean;
  userCenterId?: number;
}

export default function EmployeeModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
  isReadOnly = false,
  userCenterId,
}: EmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!employee && !isReadOnly;

  const form = useForm<EmployeeFormData>({
    resolver: isReadOnly ? undefined : zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: EmployeeRole.INSTRUCTOR,
      status: EmployeeStatus.ACTIVE,
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      qualifications: "",
      salary: "",
      description: "",
      centerId: "",
    },
  });

  // Reset form when modal opens/closes or employee changes
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        // Editing existing employee
        form.reset({
          name: employee.name,
          email: employee.email,
          password: "", // Don't pre-fill password
          phone: employee.phone || "",
          role: employee.role,
          status: employee.status,
          street: employee.street || "",
          city: employee.city || "",
          state: employee.state || "",
          postalCode: employee.postalCode || "",
          country: employee.country || "",
          qualifications: employee.qualifications || "",
          salary: employee.salary?.toString() || "",
          description: employee.description || "",
          centerId: employee.centerId?.toString() || "",
        });
      } else {
        // Adding new employee
        form.reset({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: EmployeeRole.INSTRUCTOR,
          status: EmployeeStatus.ACTIVE,
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
          qualifications: "",
          salary: "",
          description: "",
          centerId: userCenterId?.toString() || "",
        });
      }
    }
  }, [isOpen, employee, form, userCenterId]);

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setIsSubmitting(true);

      // Clean up empty strings and convert to proper types
      const cleanData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        status: data.status,
        street: data.street || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        postalCode: data.postalCode || undefined,
        country: data.country || undefined,
        qualifications: data.qualifications || undefined,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        description: data.description || undefined,
        centerId:
          userCenterId || (data.centerId ? parseInt(data.centerId) : undefined),
      };

      if (isEditing && employee) {
        // Update existing employee
        const updateData: UpdateEmployeeRequest = cleanData;

        const response = await employeeService.updateEmployee(
          employee.id,
          updateData
        );

        if (response.success) {
          toast.success("Employee updated successfully");
          onSuccess();
          onClose();
        } else {
          // Show specific error message from API response
          toast.error(response.message || "Failed to update employee");
          // Modal stays open on error
        }
      } else {
        // Create new employee
        const createData: CreateEmployeeRequest = {
          ...cleanData,
          password: null, // Null password - backend will handle password creation
        };

        const response = await employeeService.createEmployee(createData);

        if (response.success) {
          toast.success("Employee created successfully");
          onSuccess();
          onClose();
        } else {
          // Show specific error message from API response
          toast.error(response.message || "Failed to create employee");
          // Modal stays open on error
        }
      }
    } catch {
      toast.error("An error occurred while saving the employee");
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
              : "Fill in the details to create a new employee."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number"
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
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter salary"
                        {...field}
                        readOnly={isReadOnly}
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
                        {Object.entries(EmployeeRoleLabels).map(
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
                        {Object.entries(EmployeeStatusLabels).map(
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

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address Information</h3>

              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter street address"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter city"
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
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter state"
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
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter postal code"
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter country"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>

              <FormField
                control={form.control}
                name="qualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualifications</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter educational/professional qualifications"
                        className="min-h-[80px]"
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter employee bio/description"
                        className="min-h-[80px]"
                        {...field}
                        readOnly={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
