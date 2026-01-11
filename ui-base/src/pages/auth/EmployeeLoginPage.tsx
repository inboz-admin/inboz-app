import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { apiService } from "@/api";
import { type BaseResponse } from "@/api/types";
import { useAppStore } from "@/stores";
import { z } from "zod";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

// Zod schema for employee login form validation
const employeeLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type EmployeeLoginFormData = z.infer<typeof employeeLoginSchema>;

interface EmployeeLoginResponse {
  access_token: string;
  refresh_token: string;
  employee: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    role: "SUPERADMIN" | "SUPPORT";
    type: "employee";
  };
}

export default function EmployeeLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<EmployeeLoginFormData>>({});
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [formData, setFormData] = useState<EmployeeLoginFormData>({
    email: "",
    password: "",
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate form data with Zod
      const validatedData = employeeLoginSchema.parse(formData);

      const response = (await apiService.post("/auth/employee/login", {
        email: validatedData.email,
        password: validatedData.password,
      })) as BaseResponse<{ success: boolean; data: EmployeeLoginResponse; message: string }>;

      if (response.success && response.data) {
        // Handle nested response structure: response.data.data contains the actual login response
        const loginData = response.data.data || response.data;
        const { employee, access_token, refresh_token } = loginData;

        // Save employee data to Zustand store
        setUser({
          id: employee.id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          avatarUrl: employee.avatarUrl,
          role: employee.role,
          type: "employee",
          accessToken: access_token,
          organizationId: undefined, // Employees don't have organizationId initially
          selectedOrganizationId: undefined,
        });

        // Manually set the auth token
        if (access_token) {
          apiService.setAuthToken(access_token);
        }

        toast.success("Login successful! Welcome back.");
        navigate("/dashboard");
      } else {
        toast.error(
          response.message || "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        const fieldErrors: Partial<EmployeeLoginFormData> = {};
        error.issues.forEach((err) => {
          const fieldName = err.path[0];
          if (
            fieldName &&
            typeof fieldName === "string" &&
            fieldName in employeeLoginSchema.shape
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fieldErrors as any)[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // Handle unexpected errors
        toast.error(
          "An unexpected error occurred during login. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Dot Pattern Background with Glow Effect */}
      <div className="absolute inset-0 z-0">
        <DotPattern
          glow={true}
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className={cn(
            "[mask-image:radial-gradient(100vw_circle_at_center,white,transparent)]"
          )}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 w-full max-w-sm sm:max-w-md"
          )}
        >
          {/* Brand */}
          <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4">
            <h1 className="text-2xl font-bold text-foreground">
              Inboz Admin
            </h1>
          </div>

          <Card className="w-full bg-card border-border">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Welcome back</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Enter your credentials to access the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:gap-6">
                  <div className="grid gap-4 sm:gap-6">
                    <div className="grid gap-2 sm:gap-3">
                      <Label htmlFor="email" className="text-sm sm:text-base">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        aria-describedby={errors.email ? "email-error" : undefined}
                        className={`bg-background ${
                          errors.email ? "border-red-500" : ""
                        }`}
                      />
                      {errors.email && (
                        <p
                          id="email-error"
                          className="text-sm text-red-500"
                          role="alert"
                        >
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2 sm:gap-3">
                      <Label htmlFor="password" className="text-sm sm:text-base">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          aria-describedby={
                            errors.password ? "password-error" : undefined
                          }
                          className={`pr-10 bg-background ${
                            errors.password ? "border-red-500" : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p
                          id="password-error"
                          className="text-sm text-red-500"
                          role="alert"
                        >
                          {errors.password}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-sm text-primary hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button
                      type="submit"
                      className="w-full cursor-pointer transition-all duration-200"
                      disabled={isLoading}
                      aria-describedby="login-status"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Signing in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                    <div id="login-status" className="sr-only" aria-live="polite">
                      {isLoading ? "Signing in, please wait..." : "Ready to login"}
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
}

