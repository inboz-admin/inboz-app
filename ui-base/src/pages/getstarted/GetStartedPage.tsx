import { GetStartedForm } from "@/components/getstarted/getstarted-form";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { LoginRedirect } from "@/components/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function GetStartedPage() {
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
        <GetStartedForm />
      </div>

      {/* Handle login redirects */}
      <LoginRedirect />
    </div>
  );
}
