import { CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PaymentProvider = "RAZORPAY" | "STRIPE";

interface PaymentProviderSelectorProps {
  selectedProvider: PaymentProvider;
  onProviderChange: (provider: PaymentProvider) => void;
}

export function PaymentProviderSelector({
  selectedProvider,
  onProviderChange,
}: PaymentProviderSelectorProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Select Payment Provider</Label>
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={cn(
            "p-4 cursor-pointer transition-colors",
            selectedProvider === "RAZORPAY"
              ? "border-primary bg-primary/5"
              : "hover:bg-accent"
          )}
          onClick={() => onProviderChange("RAZORPAY")}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold">Razorpay</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Manual renewal
            </p>
          </div>
        </Card>
        <Card
          className={cn(
            "p-4 cursor-pointer transition-colors",
            selectedProvider === "STRIPE"
              ? "border-primary bg-primary/5"
              : "hover:bg-accent"
          )}
          onClick={() => onProviderChange("STRIPE")}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold">Stripe</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Auto-renewal
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

