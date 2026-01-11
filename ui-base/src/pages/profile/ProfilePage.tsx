"use client";

import { User as UserIcon, Mail, Phone, Shield } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/appStore";

export default function ProfilePage() {
  const { user } = useAppStore();

  if (!user) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              No user data available
            </h2>
            <p className="text-sm text-muted-foreground">
              Please log in to view your profile
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get full name from firstName and lastName, or fallback to empty string
  const fullName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.firstName || user.lastName || "";

  return (
    <div className="w-full px-2 py-2">
      <Card className="shadow-none border m-2">
        <CardContent>
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Name
                </label>
                <Input
                  value={fullName}
                  readOnly
                  className="cursor-not-allowed"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <Input
                  type="tel"
                  value=""
                  readOnly
                  className="cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Role - Read Only */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </label>
                <Input
                  value={user.role || ""}
                  readOnly
                  className="cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  value={user.email || ""}
                  readOnly
                  className="cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
