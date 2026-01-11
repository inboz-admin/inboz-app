import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, CheckCircle } from "lucide-react";

type BillingCycle = "MONTHLY" | "YEARLY";

interface PricingCalculation {
  basePricePerUser: number;
  volumeDiscountPercent: number;
  discountedPricePerUser: number;
  totalAmount: number;
  savings: number;
}

const PLANS = [
  { id: "starter", name: "Starter", monthlyPrice: 29, yearlyPrice: 290, dailyLimit: 300 },
  { id: "pro", name: "Pro", monthlyPrice: 39, yearlyPrice: 390, dailyLimit: 600 },
  { id: "scale", name: "Scale", monthlyPrice: 49, yearlyPrice: 490, dailyLimit: 1000 },
];

interface PricingCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingCalculatorModal({
  open,
  onOpenChange,
}: PricingCalculatorModalProps) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [userCount, setUserCount] = useState<number>(1);
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null);

  const calculateVolumeDiscount = (userCount: number): number => {
    if (userCount < 1) return 0;
    if (userCount >= 1 && userCount <= 4) return 0;
    else if (userCount >= 5 && userCount <= 10) return 10;
    else if (userCount >= 11 && userCount <= 25) return 15;
    else if (userCount >= 26 && userCount <= 50) return 20;
    else return -1; // 50+ users - Contact Sales
  };

  const calculatePricing = () => {
    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    const basePricePerUser =
      billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;

    const volumeDiscountPercent = calculateVolumeDiscount(userCount);

    if (volumeDiscountPercent === -1) {
      setCalculation({
        basePricePerUser: 0,
        volumeDiscountPercent: 0,
        discountedPricePerUser: 0,
        totalAmount: 0,
        savings: 0,
      });
      return;
    }

    const discountMultiplier = 1 - volumeDiscountPercent / 100;
    const discountedPricePerUser = basePricePerUser * discountMultiplier;
    const totalAmount = discountedPricePerUser * userCount;

    const originalTotal = basePricePerUser * userCount;
    const savings = originalTotal - totalAmount;

    setCalculation({
      basePricePerUser,
      volumeDiscountPercent,
      discountedPricePerUser: Math.round(discountedPricePerUser * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      savings: Math.round(savings * 100) / 100,
    });
  };

  useEffect(() => {
    if (open) {
      calculatePricing();
    }
  }, [selectedPlan, billingCycle, userCount, open]);

  const plan = PLANS.find((p) => p.id === selectedPlan);
  const requiresContactSales = userCount > 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-[60vw] !max-h-[95vh] overflow-y-auto p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl mb-2">Pricing Calculator</DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Controls */}
          <div className="min-w-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Configure Your Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Plan Selection */}
                <div className="space-y-2">
                  <Label htmlFor="plan">Select Plan</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger id="plan" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.name}</span>
                            <span className="text-sm text-muted-foreground ml-4">
                              ${plan.monthlyPrice}/user/month
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={billingCycle === "MONTHLY" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setBillingCycle("MONTHLY")}
                    >
                      Monthly
                    </Button>
                    <Button
                      variant={billingCycle === "YEARLY" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setBillingCycle("YEARLY")}
                    >
                      Yearly
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Save 2 months
                      </Badge>
                    </Button>
                  </div>
                </div>

                {/* User Count */}
                <div className="space-y-2">
                  <Label htmlFor="users">Number of Users</Label>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <Input
                      id="users"
                      type="number"
                      min="1"
                      max="100"
                      value={userCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setUserCount(Math.max(1, Math.min(100, value)));
                      }}
                      className="flex-1"
                    />
                  </div>
                  {userCount > 50 && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                      For 50+ users, please contact sales for custom pricing.
                    </p>
                  )}
                </div>

                {/* Plan Details */}
                {plan && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-600 inline mr-2" />
                      {plan.dailyLimit.toLocaleString()} emails per day per user
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Results */}
          <div className="min-w-0">
            <Card className="border-2 border-primary">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Pricing Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {requiresContactSales ? (
                  <div className="text-center py-8">
                    <p className="text-lg font-semibold mb-2">
                      Custom Enterprise Pricing
                    </p>
                    <p className="text-muted-foreground mb-4">
                      For teams with 50+ users, we offer custom pricing and dedicated support.
                    </p>
                    <Button>Contact Sales</Button>
                  </div>
                ) : calculation ? (
                  <>
                    {/* Base Price */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Price per User</span>
                        <span className="font-medium text-right">
                          ${calculation.basePricePerUser.toFixed(2)}/
                          {billingCycle === "YEARLY" ? "year" : "month"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Users</span>
                        <span className="font-medium">{userCount}</span>
                      </div>
                    </div>

                    {/* Volume Discount */}
                    {calculation.volumeDiscountPercent > 0 && (
                      <div className="pt-5 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Volume Discount ({calculation.volumeDiscountPercent}%)
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            -${calculation.savings.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="pt-5 border-t-2">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-lg font-semibold">Total</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            ${calculation.totalAmount.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            /{billingCycle === "YEARLY" ? "year" : "month"}
                          </div>
                        </div>
                      </div>
                      {billingCycle === "YEARLY" && (
                        <p className="text-xs text-muted-foreground text-center mb-2">
                          ${(calculation.totalAmount / 12).toFixed(2)}/month
                        </p>
                      )}
                      {calculation.savings > 0 && (
                        <p className="text-xs text-green-600 text-center">
                          You save ${calculation.savings.toFixed(2)}/{billingCycle === "YEARLY" ? "year" : "month"}
                        </p>
                      )}
                    </div>

                    {/* Discount Tiers Info */}
                    <div className="pt-5 border-t">
                      <p className="text-xs font-semibold mb-3 text-muted-foreground">
                        Volume Discount Tiers:
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span>1-4 users:</span>
                          <span className="font-medium">0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>5-10 users:</span>
                          <span className="font-medium text-green-600">10%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>11-25 users:</span>
                          <span className="font-medium text-green-600">15%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>26-50 users:</span>
                          <span className="font-medium text-green-600">20%</span>
                        </div>
                      </div>
                    </div>

                    {/* Start Trial Button */}
                    <div className="pt-6 border-t mt-4">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => {
                          onOpenChange(false);
                          navigate("/get-started");
                        }}
                      >
                        Start Free Trial
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        No credit card required • 7-day free trial
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Configure your plan to see pricing
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

