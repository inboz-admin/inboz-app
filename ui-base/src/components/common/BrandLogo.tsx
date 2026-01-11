import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export function BrandLogo({
  size = "lg",
  showText = false,
  className,
  onClick,
}: BrandLogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
    "2xl": "h-40 w-40",
    "3xl": "h-48 w-48",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <img 
        src="/brand/63.svg" 
        alt="Inboz Logo" 
        className={cn(
          "object-contain dark:brightness-0 dark:invert transition-all",
          sizeClasses[size]
        )}
      />
    </div>
  );
}
