"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StripeCheckoutProps {
  checkoutSessionUrl?: string;
  clientSecret?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StripeCheckout({
  checkoutSessionUrl,
  clientSecret,
  onSuccess,
  onError,
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!checkoutSessionUrl) {
      toast.error("Checkout session URL is missing");
      return;
    }

    setLoading(true);
    try {
      // Redirect to Stripe Checkout
      window.location.href = checkoutSessionUrl;
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error?.message || "Failed to open Stripe checkout";
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || !checkoutSessionUrl}
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        "Continue to Stripe Checkout"
      )}
    </Button>
  );
}

