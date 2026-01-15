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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiService } from "@/api";
import { AuthHelpers, type LoginResponse } from "@/api/authService";
import { type BaseResponse } from "@/api/types";
import { useAppStore } from "@/stores";
import { z } from "zod";
import { toast } from "sonner";
import { ForgotPasswordModal } from "@/components/auth";

// Zod schema for login form validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  userType: z.enum(["employee", "student"]),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    userType: "employee",
  });

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  const handleBrandClick = () => {
    navigate("/");
  };

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

  const handleUserTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      userType: value as "employee" | "student",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate form data with Zod
      const validatedData = loginSchema.parse(formData);

      const response = (await apiService.post("/auth/login", {
        email: validatedData.email,
        password: validatedData.password,
        userType: validatedData.userType,
      })) as BaseResponse<LoginResponse>;

      if (response.success) {
        // Extract user data from response
        const userData = AuthHelpers.getUserFromResponse(response);

        if (userData) {
          // Save user data to Zustand store
          setUser(userData);

          // Manually set the auth token to ensure it's properly stored
          if (userData.accessToken) {
            apiService.setAuthToken(userData.accessToken);
          }

          toast.success("Login successful! Welcome back.");
          // LoginRedirect component will handle the navigation
        } else {
          toast.error("Login failed: Unable to process user data");
        }
      } else {
        // Handle specific authentication errors
        toast.error(
          response.message || "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        const fieldErrors: Partial<LoginFormData> = {};
        error.issues.forEach((err) => {
          const fieldName = err.path[0];
          if (
            fieldName &&
            typeof fieldName === "string" &&
            fieldName in loginSchema.shape
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fieldErrors as any)[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // Handle unexpected errors (API errors are handled by apiService)
        toast.error(
          "An unexpected error occurred during login. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 w-full max-w-sm sm:max-w-md",
        className
      )}
      {...props}
    >
      {/* Inboz Brand */}
      <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4">
        <h1
          className="text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors duration-200 bg-transparent"
          onClick={handleBrandClick}
        >
          Inboz
        </h1>
      </div>

      <Card className="w-full bg-card border-border">
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Welcome back</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:gap-6">
              <div className="grid gap-4 sm:gap-6">
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="userType" className="text-sm sm:text-base">
                    User Type
                  </Label>
                  <Select
                    required
                    value={formData.userType}
                    onValueChange={handleUserTypeChange}
                    aria-describedby={
                      errors.userType ? "userType-error" : undefined
                    }
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.userType && (
                    <p
                      id="userType-error"
                      className="text-sm text-red-500"
                      role="alert"
                    >
                      {errors.userType}
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="email" className="text-sm sm:text-base">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="johndoe@mailinator.com"
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
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-sm sm:text-base">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="ml-auto text-xs sm:text-sm underline-offset-4 hover:text-primary cursor-pointer hover:underline z-10 relative transition-colors duration-200"
                    >
                      Forgot your password?
                    </button>
                  </div>
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
      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our{" "}
        <a
          href="/terms-and-conditions"
          onClick={(e) => {
            e.preventDefault();
            navigate("/terms-and-conditions");
          }}
          className="underline underline-offset-4 hover:text-primary font-semibold"
        >
          Terms and Conditions
        </a>{" "}
        and{" "}
        <a
          href="/privacy-policy"
          onClick={(e) => {
            e.preventDefault();
            navigate("/privacy-policy");
          }}
          className="underline underline-offset-4 hover:text-primary font-semibold"
        >
          Privacy Policy
        </a>
        .
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
}
