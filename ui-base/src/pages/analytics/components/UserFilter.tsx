import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyticsService } from "@/api/analyticsService";
import type { AnalyticsUser } from "@/api/analyticsTypes";
import { toast } from "sonner";

interface UserFilterProps {
  organizationId: string;
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
}

export function UserFilter({
  organizationId,
  selectedUserId,
  onUserChange,
}: UserFilterProps) {
  const [users, setUsers] = React.useState<AnalyticsUser[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (organizationId) {
      fetchUsers();
    }
  }, [organizationId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getUsersWithAnalytics({
        organizationId,
      });
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("An error occurred while loading users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (value: string) => {
    const userId = value === "all" ? null : value;
    onUserChange(userId);

    // Save to session storage
    if (userId) {
      sessionStorage.setItem("analytics_userId", userId);
    } else {
      sessionStorage.removeItem("analytics_userId");
    }
  };

  return (
    <Select
      value={selectedUserId || "all"}
      onValueChange={handleUserChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={loading ? "Loading..." : "Select User"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Users</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.fullName || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

