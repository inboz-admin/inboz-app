import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { apiService, type BaseResponse } from "@/api";

// Validation schemas
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const verifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
type VerifyOtpData = z.infer<typeof verifyOtpSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiResponse {
  message: string;
  success: boolean;
  token?: string;
}

type Step = "request" | "verify" | "reset";

export function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("request");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Request password reset
  const [requestData, setRequestData] = useState<ForgotPasswordData>({
    email: "",
  });

  // Step 2: Verify OTP
  const [otpData, setOtpData] = useState<VerifyOtpData>({
    email: "",
    otp: "",
  });

  // Step 3: Reset password
  const [resetData, setResetData] = useState<ResetPasswordData>({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const validatedData = forgotPasswordSchema.parse(requestData);

      const response = (await apiService.post("/auth/forgot-password", {
        email: validatedData.email,
      })) as BaseResponse<ApiResponse>;

      if (response.success) {
        toast.success(
          response.data?.message || "Verification code sent to your email"
        );

        // Move to next step and store data
        setOtpData({
          email: validatedData.email,
          otp: "",
        });
        setResetData({
          email: validatedData.email,
          otp: "",
          newPassword: "",
          confirmPassword: "",
        });
        setCurrentStep("verify");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const fieldName = err.path[0];
          if (fieldName && typeof fieldName === "string") {
            fieldErrors[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Request password reset error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const validatedData = verifyOtpSchema.parse(otpData);

      const response = (await apiService.post("/auth/verify-reset-otp", {
        email: validatedData.email,
        otp: validatedData.otp,
      })) as BaseResponse<ApiResponse>;

      if (response.success) {
        toast.success(response.data?.message || "Verification successful");

        // Move to next step and store OTP
        setResetData((prev) => ({
          ...prev,
          otp: validatedData.otp,
        }));
        setCurrentStep("reset");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const fieldName = err.path[0];
          if (fieldName && typeof fieldName === "string") {
            fieldErrors[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Verify OTP error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Check if passwords match
      if (resetData.newPassword !== resetData.confirmPassword) {
        setErrors({ confirmPassword: "Passwords do not match" });
        return;
      }

      const validatedData = resetPasswordSchema.parse(resetData);

      const response = (await apiService.post("/auth/reset-password", {
        email: validatedData.email,
        otp: validatedData.otp,
        newPassword: validatedData.newPassword,
      })) as BaseResponse<ApiResponse>;

      if (response.success) {
        toast.success(response.data?.message || "Password reset successfully");
        handleClose();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          const fieldName = err.path[0];
          if (fieldName && typeof fieldName === "string") {
            fieldErrors[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Reset password error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      // Reset all states
      setCurrentStep("request");
      setRequestData({ email: "" });
      setOtpData({ email: "", otp: "" });
      setResetData({
        email: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
      onClose();
    }
  };

  const goBack = () => {
    if (currentStep === "verify") {
      setCurrentStep("request");
    } else if (currentStep === "reset") {
      setCurrentStep("verify");
    }
    setErrors({});
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "request":
        return (
          <form onSubmit={handleRequestSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={requestData.email}
                  onChange={(e) =>
                    setRequestData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Enter your email"
                  className={errors.email ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </DialogFooter>
          </form>
        );

      case "verify":
        return (
          <form onSubmit={handleVerifyOtpSubmit}>
            <div className="grid gap-4 py-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit verification code to{" "}
                  <strong>{otpData.email}</strong>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  value={otpData.otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpData((prev) => ({ ...prev, otp: value }));
                  }}
                  placeholder="Enter 6-digit code"
                  className={`text-center text-lg tracking-widest ${
                    errors.otp ? "border-red-500" : ""
                  }`}
                  disabled={isLoading}
                  maxLength={6}
                />
                {errors.otp && (
                  <p className="text-sm text-red-500">{errors.otp}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={isLoading}
                className="cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || otpData.otp.length !== 6}
                className="cursor-pointer"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </DialogFooter>
          </form>
        );

      case "reset":
        return (
          <form onSubmit={handleResetPasswordSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={resetData.newPassword}
                  onChange={(e) =>
                    setResetData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter new password"
                  className={errors.newPassword ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-500">{errors.newPassword}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={resetData.confirmPassword}
                  onChange={(e) =>
                    setResetData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Confirm new password"
                  className={errors.confirmPassword ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={isLoading}
                className="cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "request":
        return "Forgot Password";
      case "verify":
        return "Verify Email";
      case "reset":
        return "Reset Password";
      default:
        return "Forgot Password";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "request":
        return "Enter your email address and select your user type. We'll send you a verification code.";
      case "verify":
        return "Enter the 6-digit verification code sent to your email address.";
      case "reset":
        return "Enter your new password below.";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}
