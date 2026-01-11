import { LoginForm } from "@/components/login/login-form";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { LoginRedirect } from "@/components/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Flickering Grid Background */}
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="#6B7280"
        maxOpacity={0.5}
        flickerChance={0.1}
        height={dimensions.height}
        width={dimensions.width}
      />

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <LoginForm />
      </div>

      {/* Handle login redirects */}
      <LoginRedirect />
    </div>
  );
}
