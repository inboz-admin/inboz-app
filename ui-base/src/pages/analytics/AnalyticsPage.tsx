"use client";

import * as React from "react";
import { analyticsService } from "@/api/analyticsService";
import type {
  KpiStats,
  UserWiseAnalytics,
  CampaignAnalytics,
  OrganizationAnalytics,
} from "@/api/analyticsTypes";
import { toast } from "sonner";
import { KpiCards } from "./components/KpiCards";
import { DateFilter } from "./components/DateFilter";
import { UserFilter } from "./components/UserFilter";
import { UserAnalyticsTable } from "./components/UserAnalyticsTable";
import { CampaignPerformanceTable } from "./components/CampaignPerformanceTable";
import { OrganizationAnalyticsTable } from "./components/OrganizationAnalyticsTable";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { RefreshCw, Building2 } from "lucide-react";
import { UserRole } from "@/api/userTypes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AnalyticsPage() {
  const { user, platformView, setPlatformView, selectedOrganizationId } = useAppStore();
  const isSuperAdminEmployee = user?.type === "employee" && user?.role === "SUPERADMIN";
  const isEmployee = user?.type === "employee";
  
  // For employees, use selectedOrganizationId from store (can be null for "ALL")
  // For regular users, use organizationId from user object
  const effectiveOrganizationId = isEmployee ? selectedOrganizationId : user?.organizationId;
  const [kpiStats, setKpiStats] = React.useState<KpiStats | null>(null);
  const [userAnalytics, setUserAnalytics] = React.useState<UserWiseAnalytics[]>([]);
  const [campaignAnalytics, setCampaignAnalytics] = React.useState<CampaignAnalytics[]>([]);
  const [organizationAnalytics, setOrganizationAnalytics] = React.useState<OrganizationAnalytics[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Pagination state for campaigns
  const [campaignPage, setCampaignPage] = React.useState(1);
  const [campaignPageSize, setCampaignPageSize] = React.useState(50);
  const [campaignTotalCount, setCampaignTotalCount] = React.useState(0);
  
  // Pagination state for users
  const [userPage, setUserPage] = React.useState(1);
  const [userPageSize, setUserPageSize] = React.useState(50);
  const [userTotalCount, setUserTotalCount] = React.useState(0);
  
  // Pagination state for organizations
  const [organizationPage, setOrganizationPage] = React.useState(1);
  const [organizationPageSize, setOrganizationPageSize] = React.useState(50);
  const [organizationTotalCount, setOrganizationTotalCount] = React.useState(0);
  
  // Initialize with default 7d range to match DateFilter default
  const getDefaultDateRange = React.useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    endDate.setHours(23, 59, 59, 999);
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }, []);
  
  // Load date range from session storage or use default
  const defaultDates = React.useMemo(() => {
    const savedStartDate = sessionStorage.getItem('analytics_startDate');
    const savedEndDate = sessionStorage.getItem('analytics_endDate');
    
    if (savedStartDate && savedEndDate) {
      return { startDate: savedStartDate, endDate: savedEndDate };
    }
    return getDefaultDateRange();
  }, [getDefaultDateRange]);
  
  const [startDate, setStartDate] = React.useState<string | undefined>(defaultDates.startDate);
  const [endDate, setEndDate] = React.useState<string | undefined>(defaultDates.endDate);
  
  // User filter state
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(() => {
    return sessionStorage.getItem('analytics_userId') || null;
  });

  // Fetch KPI data (depends on date range and user filter)
  const fetchKpiData = React.useCallback(async () => {
    // Platform view doesn't require organizationId
    if (platformView) {
      // Platform view logic here
    } else {
      // For regular users, require organizationId
      if (!isEmployee && !user?.organizationId) return;
      
      // For employees, require selectedOrganizationId (apiService will add it automatically)
      if (isEmployee && !selectedOrganizationId) {
        setKpiStats(null);
        return;
      }
    }

    const baseParams: { startDate?: string; endDate?: string; organizationId?: string; userId?: string; platformView?: boolean } = {};
    if (startDate) baseParams.startDate = startDate;
    if (endDate) baseParams.endDate = endDate;
    if (platformView) {
      baseParams.platformView = true;
    } else {
      // For employees, apiService will automatically add organizationId from store if selected
      // For regular users, use organizationId from user object
      if (!isEmployee && user?.organizationId) {
        baseParams.organizationId = user.organizationId;
      }
      // Note: For employees, don't manually add organizationId - apiService handles it
      if (selectedUserId) baseParams.userId = selectedUserId;
    }

    try {
      const kpiResponse = await analyticsService.getKpiStats(baseParams);
      
      if (kpiResponse.success && kpiResponse.data) {
        const nestedData = (kpiResponse.data as any).data;
        const kpiData = nestedData && nestedData.totalUsers ? nestedData : kpiResponse.data;
        setKpiStats(kpiData as KpiStats);
      } else {
        toast.error(kpiResponse.message || "Failed to load KPI statistics");
        setKpiStats(null);
      }
    } catch (error) {
      console.error("Error fetching KPI data:", error);
      toast.error("An error occurred while loading KPI statistics");
      setKpiStats(null);
    }
  }, [startDate, endDate, effectiveOrganizationId, selectedUserId, platformView, isEmployee, selectedOrganizationId]);

  // Fetch Campaign analytics (depends on date range, campaign pagination, and user filter)
  const fetchCampaignData = React.useCallback(async () => {
    // Platform view doesn't support campaign/user analytics yet
    if (platformView) {
      setCampaignAnalytics([]);
      setCampaignTotalCount(0);
      return;
    }
    // For regular users, require organizationId
    if (!isEmployee && !user?.organizationId) return;
    
    // For employees, require selectedOrganizationId (apiService will add it automatically)
    if (isEmployee && !selectedOrganizationId) {
      setCampaignAnalytics([]);
      setCampaignTotalCount(0);
      return;
    }

    const baseParams: { startDate?: string; endDate?: string; organizationId?: string; userId?: string } = {};
    if (startDate) baseParams.startDate = startDate;
    if (endDate) baseParams.endDate = endDate;
    // For employees, don't manually add organizationId - apiService handles it automatically
    // For regular users, add organizationId from user object
    if (!isEmployee && user?.organizationId) {
      baseParams.organizationId = user.organizationId;
    }
    if (selectedUserId) baseParams.userId = selectedUserId;

    try {
      const campaignResponse = await analyticsService.getCampaignWiseAnalytics({
        ...baseParams,
        page: campaignPage,
        limit: campaignPageSize,
        status: ['COMPLETED'], // Show only completed campaigns
      });

      if (campaignResponse.success && campaignResponse.data) {
        const responseData = campaignResponse.data as any;
        if (responseData.data && Array.isArray(responseData.data)) {
          setCampaignAnalytics(responseData.data);
          setCampaignTotalCount(responseData.total || 0);
        } else if (Array.isArray(campaignResponse.data)) {
          setCampaignAnalytics(campaignResponse.data as CampaignAnalytics[]);
          setCampaignTotalCount((campaignResponse.data as CampaignAnalytics[]).length);
        } else {
          setCampaignAnalytics([]);
          setCampaignTotalCount(0);
        }
      } else {
        toast.error(campaignResponse.message || "Failed to load campaign analytics");
        setCampaignAnalytics([]);
        setCampaignTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      toast.error("An error occurred while loading campaign analytics");
      setCampaignAnalytics([]);
      setCampaignTotalCount(0);
    }
  }, [startDate, endDate, effectiveOrganizationId, campaignPage, campaignPageSize, selectedUserId, isEmployee, platformView]);

  // Fetch User analytics (depends on date range, user pagination, and user filter)
  const fetchUserData = React.useCallback(async () => {
    // For regular users, require organizationId
    if (!isEmployee && !user?.organizationId) return;
    
    // For employees, require selectedOrganizationId (apiService will add it automatically)
    if (isEmployee && !selectedOrganizationId) {
      setUserAnalytics([]);
      setUserTotalCount(0);
      return;
    }

    const baseParams: { startDate?: string; endDate?: string; organizationId?: string; userId?: string } = {};
    if (startDate) baseParams.startDate = startDate;
    if (endDate) baseParams.endDate = endDate;
    // For employees, don't manually add organizationId - apiService handles it automatically
    // For regular users, add organizationId from user object
    if (!isEmployee && user?.organizationId) {
      baseParams.organizationId = user.organizationId;
    }
    if (selectedUserId) baseParams.userId = selectedUserId;

    try {
      const userResponse = await analyticsService.getUserWiseAnalytics({
        ...baseParams,
        page: userPage,
        limit: userPageSize,
      });

      if (userResponse.success && userResponse.data) {
        const responseData = userResponse.data as any;
        if (responseData.data && Array.isArray(responseData.data)) {
          setUserAnalytics(responseData.data);
          setUserTotalCount(responseData.total || 0);
        } else if (Array.isArray(userResponse.data)) {
          setUserAnalytics(userResponse.data as UserWiseAnalytics[]);
          setUserTotalCount((userResponse.data as UserWiseAnalytics[]).length);
        } else {
          setUserAnalytics([]);
          setUserTotalCount(0);
        }
      } else {
        toast.error(userResponse.message || "Failed to load user analytics");
        setUserAnalytics([]);
        setUserTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      toast.error("An error occurred while loading user analytics");
      setUserAnalytics([]);
      setUserTotalCount(0);
    }
  }, [startDate, endDate, effectiveOrganizationId, userPage, userPageSize, selectedUserId, isEmployee, selectedOrganizationId]);

  // Fetch Organization analytics (depends on date range and organization pagination) - Platform view only
  const fetchOrganizationData = React.useCallback(async () => {
    if (!platformView) {
      setOrganizationAnalytics([]);
      setOrganizationTotalCount(0);
      return;
    }

    const baseParams: { startDate?: string; endDate?: string } = {};
    if (startDate) baseParams.startDate = startDate;
    if (endDate) baseParams.endDate = endDate;

    try {
      const orgResponse = await analyticsService.getOrganizationBreakdown({
        ...baseParams,
        page: organizationPage,
        limit: organizationPageSize,
      });

      if (orgResponse.success && orgResponse.data) {
        const responseData = orgResponse.data as any;
        if (responseData.data && Array.isArray(responseData.data)) {
          setOrganizationAnalytics(responseData.data);
          setOrganizationTotalCount(responseData.total || 0);
        } else if (Array.isArray(orgResponse.data)) {
          setOrganizationAnalytics(orgResponse.data as OrganizationAnalytics[]);
          setOrganizationTotalCount((orgResponse.data as OrganizationAnalytics[]).length);
        } else {
          setOrganizationAnalytics([]);
          setOrganizationTotalCount(0);
        }
      } else {
        toast.error(orgResponse.message || "Failed to load organization analytics");
        setOrganizationAnalytics([]);
        setOrganizationTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching organization analytics:", error);
      toast.error("An error occurred while loading organization analytics");
      setOrganizationAnalytics([]);
      setOrganizationTotalCount(0);
    }
  }, [startDate, endDate, organizationPage, organizationPageSize, platformView]);

  // Listen for organization changes from OrganizationSelector
  React.useEffect(() => {
    const handleOrganizationChange = () => {
      // When organization changes, refetch all data (only in non-platform view)
      if (!platformView) {
        setLoading(true);
        Promise.all([
          fetchKpiData(),
          fetchCampaignData(),
          fetchUserData(),
        ]).finally(() => {
          setLoading(false);
        });
      }
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, [fetchKpiData, fetchCampaignData, fetchUserData, platformView]);

  // Initial load and date range changes - fetch all data
  React.useEffect(() => {
    // Platform view doesn't require organizationId
    // For regular users, require organizationId. For employees, allow without (can show all data)
    if (!platformView && !isEmployee && !user?.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const promises = [fetchKpiData()];
    
    if (platformView) {
      promises.push(fetchOrganizationData());
    } else {
      promises.push(fetchCampaignData(), fetchUserData());
    }
    
    Promise.all(promises).finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, effectiveOrganizationId, selectedUserId, platformView, isEmployee, selectedOrganizationId]);

  // Update only campaign data when campaign pagination changes
  React.useEffect(() => {
    // For regular users, require organizationId. For employees, allow without
    if (!isEmployee && !user?.organizationId) return;
    fetchCampaignData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignPage, campaignPageSize, isEmployee]);

  // Update only user data when user pagination changes
  React.useEffect(() => {
    // For regular users, require organizationId. For employees, allow without
    if (!isEmployee && !user?.organizationId) return;
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, userPageSize, isEmployee]);

  // Update only organization data when organization pagination changes
  React.useEffect(() => {
    if (!platformView) return;
    fetchOrganizationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationPage, organizationPageSize]);

  const handleDateRangeChange = React.useCallback(
    (newStartDate?: string, newEndDate?: string) => {
      setStartDate(newStartDate);
      setEndDate(newEndDate);
      
      // Save dates to session storage
      // Note: The date range type (7d, 30d, etc.) is saved in DateFilter component
      if (newStartDate && newEndDate) {
        sessionStorage.setItem('analytics_startDate', newStartDate);
        sessionStorage.setItem('analytics_endDate', newEndDate);
      } else {
        sessionStorage.removeItem('analytics_startDate');
        sessionStorage.removeItem('analytics_endDate');
      }
      
      // Reset pagination when date range changes
      setCampaignPage(1);
      setUserPage(1);
      setOrganizationPage(1);
    },
    []
  );

  const handleCampaignPaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      setCampaignPage(page);
      setCampaignPageSize(pageSize);
    },
    []
  );

  const handleUserPaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      setUserPage(page);
      setUserPageSize(pageSize);
    },
    []
  );

  const handleOrganizationPaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      setOrganizationPage(page);
      setOrganizationPageSize(pageSize);
    },
    []
  );

  const handleRefresh = React.useCallback(() => {
    if (platformView) {
      setLoading(true);
      Promise.all([
        fetchKpiData(),
        fetchOrganizationData(),
      ]).finally(() => {
        setLoading(false);
      });
    } else if (isEmployee || user?.organizationId) {
      // For employees, allow refresh even without organizationId (can show all data)
      setLoading(true);
      Promise.all([
        fetchKpiData(),
        fetchCampaignData(),
        fetchUserData(),
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [fetchKpiData, fetchCampaignData, fetchUserData, fetchOrganizationData, effectiveOrganizationId, platformView, isEmployee]);

  return (
    <div className="w-full p-4 space-y-6 lg:p-6">
      {/* Header with Title and Date Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track key performance metrics and user activity across your email campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdminEmployee && (
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
              <Switch
                id="platform-view"
                checked={platformView}
                onCheckedChange={(checked) => {
                  setPlatformView(checked);
                  // Reset filters when switching views
                  setSelectedUserId(null);
                  sessionStorage.removeItem('analytics_userId');
                }}
              />
              <Label htmlFor="platform-view" className="text-sm font-medium cursor-pointer">
                Platform View
              </Label>
            </div>
          )}
          {!platformView && user?.role === UserRole.ADMIN ? (
            <UserFilter
              organizationId={user?.organizationId || ''}
              selectedUserId={selectedUserId}
              onUserChange={(userId) => {
                setSelectedUserId(userId);
                // Reset pagination when user filter changes
                setCampaignPage(1);
                setUserPage(1);
              }}
            />
          ) : null}
          <DateFilter onDateRangeChange={handleDateRangeChange} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh analytics data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* View Mode Indicator */}
      {isSuperAdminEmployee && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
          <Building2 className="h-4 w-4" />
          <span className="text-sm font-medium">
            {platformView ? "Platform Analytics (All Organizations)" : "Organization Analytics"}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <KpiCards data={kpiStats} loading={loading} platformView={platformView} />

      {/* Campaign Performance Table - Show if platform view is off */}
      {!platformView && (
        <CampaignPerformanceTable
          data={campaignAnalytics}
          loading={loading}
          totalCount={campaignTotalCount}
          currentPage={campaignPage}
          pageSize={campaignPageSize}
          onPaginationChange={handleCampaignPaginationChange}
        />
      )}

      {/* User Analytics Table - Show if platform view is off */}
      {!platformView && (
        <UserAnalyticsTable 
          data={userAnalytics} 
          loading={loading}
          totalCount={userTotalCount}
          currentPage={userPage}
          pageSize={userPageSize}
          onPaginationChange={handleUserPaginationChange}
        />
      )}

      {/* Organization Analytics Table - Show if platform view is on */}
      {platformView && (
        <OrganizationAnalyticsTable
          data={organizationAnalytics}
          loading={loading}
          totalCount={organizationTotalCount}
          currentPage={organizationPage}
          pageSize={organizationPageSize}
          onPaginationChange={handleOrganizationPaginationChange}
        />
      )}
    </div>
  );
}

