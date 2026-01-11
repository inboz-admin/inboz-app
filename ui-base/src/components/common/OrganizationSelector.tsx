import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores";
import { organizationService } from "@/api";
import { toast } from "sonner";
import type { Organization } from "@/api/organizationTypes";

export function OrganizationSelector() {
  const { user, selectedOrganizationId, setSelectedOrganizationId } = useAppStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  // Only show for employees
  if (!user || user.type !== "employee") {
    return null;
  }

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await organizationService.getOrganizations({
          page: 1,
          limit: 1000, // Get all organizations
        });

        if (response.success && response.data) {
          setOrganizations(response.data.data);
        }
      } catch (error) {
        toast.error("Failed to load organizations");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleOrganizationChange = (value: string) => {
    // "ALL" option sets selectedOrganizationId to null (shows all data)
    // Otherwise, set the selected organization ID
    const orgId = value === "ALL" ? null : value;
    setSelectedOrganizationId(orgId);
    
    const message = orgId 
      ? `Organization selected successfully`
      : `Showing all organizations`;
    toast.success(message);

    // Trigger a custom event to notify all components to refetch data
    window.dispatchEvent(new CustomEvent('organizationChanged', { detail: { organizationId: orgId } }));
  };

  const selectedOrg = selectedOrganizationId 
    ? organizations.find((org) => org.id === selectedOrganizationId)
    : null;

  return (
    <Select
      value={selectedOrganizationId || "ALL"}
      onValueChange={handleOrganizationChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select Organization">
          {selectedOrg ? selectedOrg.name : "Select Organization"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <>
            <SelectItem value="ALL">Select Organization</SelectItem>
            {organizations.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No organizations found
              </div>
            ) : (
              organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

