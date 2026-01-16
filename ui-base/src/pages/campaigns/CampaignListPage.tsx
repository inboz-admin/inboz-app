import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDateTime } from '@/utils/dateFormat';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { CampaignsApi } from '../../api/campaigns';
import type { Campaign } from '../../api/campaigns';
import { Button } from '../../components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { NoDataState } from '@/components/common/NoDataState';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCampaignProgress } from '@/hooks/useCampaignProgress';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { QuotaModeSelectionDialog } from '@/components/campaigns/QuotaModeSelectionDialog';
import { userService } from '@/api/userService';
import { roleService } from '@/api/roleService';
import { ActionType, ModuleName } from '@/api/roleTypes';
import { gmailScopeService } from '@/api/gmailScopeService';
import { GmailScopeModal } from '@/components/auth/GmailScopePrompt';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function CampaignListPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  
  // Get organization timezone
  const timezone = useOrganizationTimezone();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [organizationId, setOrganizationId] = useState<string>('');
  const { user, selectedOrganizationId } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [quotaStats, setQuotaStats] = useState<{
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
    percentUsed: number;
  } | null>(null);
  const [pendingActivation, setPendingActivation] = useState<{ campaign: Campaign; totalEmails: number } | null>(null);
  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);
  const [hasGmailScopes, setHasGmailScopes] = useState<boolean | null>(null);
  const [checkingScopes, setCheckingScopes] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [gmailModalOpen, setGmailModalOpen] = useState(false);

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  // Function to load campaigns
  const loadCampaigns = useCallback((showLoading = true) => {
    const { selectedOrganizationId } = useAppStore.getState();
    const isEmployee = user?.type === 'employee';
    
    // For employees: don't require organizationId (apiService will handle it)
    // For regular users: require organizationId from user object
    if (!isEmployee && !user?.organizationId) return;
    
    // For regular users, use organizationId from user object
    // For employees, apiService will automatically add selectedOrganizationId from store
    const orgId = isEmployee ? selectedOrganizationId : user?.organizationId;
    if (orgId) {
      setOrganizationId(orgId);
    }
    
    if (showLoading) setLoading(true);
    
    // Build params - for employees, don't pass organizationId (apiService adds it)
    // For regular users, pass organizationId
    const params: any = { page, limit };
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    // Only add organizationId for regular users - employees will get it from apiService
    if (!isEmployee && user?.organizationId) {
      params.organizationId = user.organizationId;
    }
    
    CampaignsApi.list(params)
      .then((res: any) => {
        if (res?.success && res?.data) {
          setItems(res.data.data || []);
          setTotalPages(res.data.totalPages || 0);
          setTotalItems(res.data.total || 0);
        } else {
          setItems([]);
          setTotalPages(0);
          setTotalItems(0);
        }
      })
      .catch(() => {
        setItems([]);
        setTotalPages(0);
        setTotalItems(0);
      })
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  }, [user, page, limit, searchTerm, statusFilter, selectedOrganizationId]);

  // Check Gmail scopes on mount
  useEffect(() => {
    const checkScopes = async () => {
      if (!user) {
        setCheckingScopes(false);
        setHasGmailScopes(false);
        return;
      }

      setCheckingScopes(true);
      try {
        const response = await gmailScopeService.checkGmailScopes();
        console.log('[CampaignListPage] Scope check response:', response);
        
        // Handle nested response structure from SuccessInterceptor
        let scopeData = null;
        if (response.success && response.data) {
          // Check if data is nested (from SuccessInterceptor)
          const data = response.data as any;
          if (data?.success !== undefined && data?.data) {
            scopeData = data.data;
          } else {
            // Direct data structure
            scopeData = response.data;
          }
        }
        
        if (scopeData && typeof scopeData.hasAllGmailScopes === 'boolean') {
          const hasAllScopes = scopeData.hasAllGmailScopes;
          console.log('[CampaignListPage] Has all Gmail scopes:', hasAllScopes, 'Scopes:', scopeData);
          setHasGmailScopes(hasAllScopes);
        } else {
          // If API call fails, assume scopes are missing to show prompt
          console.warn('[CampaignListPage] Scope check failed or returned no data:', response);
          setHasGmailScopes(false);
        }
      } catch (error) {
        // If error occurs, assume scopes are missing to show prompt
        console.error('[CampaignListPage] Failed to check Gmail scopes:', error);
        setHasGmailScopes(false);
      } finally {
        setCheckingScopes(false);
      }
    };

    checkScopes();
  }, [user]);

  // Check for successful Gmail authorization from URL params
  useEffect(() => {
    const gmailAuthorized = searchParams.get('gmail_authorized');
    if (gmailAuthorized === 'true') {
      toast.success('Gmail access granted! You can now use campaign features.');
      setSearchParams({}, { replace: true });
      // Re-check scopes
      gmailScopeService.checkGmailScopes().then((response) => {
        if (response.success && response.data) {
          // Handle nested response structure
          const data = response.data as any;
          const scopeData = (data?.success !== undefined && data?.data) 
            ? data.data 
            : response.data;
          if (scopeData && typeof scopeData.hasAllGmailScopes === 'boolean') {
            setHasGmailScopes(scopeData.hasAllGmailScopes);
          }
        }
      });
    }
  }, [searchParams, setSearchParams]);

  // Fetch module actions when user is available
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        setModuleActions([]);
        return;
      }

      try {
        // Use CAMPAIGNS module for role-based actions
        const response = await roleService.getRoleActions(user.role, ModuleName.CAMPAIGN);

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        } else {
          setModuleActions([]);
          if (response.message) {
            console.warn(`Failed to fetch campaign permissions: ${response.message}`);
          }
        }
      } catch (error) {
        setModuleActions([]);
        console.warn(
          `Failed to fetch campaign module actions: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    };

    fetchModuleActions();
  }, [user]);

  // Initial load and polling every 1 minute
  useEffect(() => {
    loadCampaigns(true); // Show loading on initial load
    
    // Set up polling interval (1 minute = 60000ms)
    // Poll silently without showing loading indicator
    const interval = setInterval(() => {
      loadCampaigns(false); // Don't show loading during polling
    }, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [loadCampaigns]);

  const checkQuotaAndActivate = async (campaign: Campaign) => {
    if (!campaign?.id || !user?.id) return;
    try {
      setQuotaDialogOpen(false);
      setPendingActivation(null);
      
      // Activate or resume the campaign based on status
      let updated;
      if (campaign.status === 'PAUSED') {
        updated = await CampaignsApi.resume(campaign.id, 'auto-spread');
        toast.success(`Campaign "${campaign.name}" resumed! Emails are being queued...`);
      } else {
        updated = await CampaignsApi.activate(campaign.id, 'auto-spread');
        toast.success(`Campaign "${campaign.name}" activated! Emails are being queued...`);
      }
      
      // Update the campaign in the list with new status
      setItems((prev) => prev.map((x) => (x.id === campaign.id ? { ...x, ...updated } : x)));
      
      // Refresh campaigns to get latest data
      loadCampaigns(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update campaign');
    }
  };

  // Check if action is available in module actions
  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  const toggleActive = async (c: Campaign, checked: boolean) => {
    if (!c?.id) return;
    
    // Don't allow toggling completed campaigns
    if (c.status === 'COMPLETED') {
      toast.error('Cannot activate a completed campaign');
      return;
    }
    
    try {
      let updated;
      if (checked) {
        // Activate or resume the campaign
        if (c.status === 'PAUSED') {
          // Resume the paused campaign - check quota first
          if (user?.id) {
            try {
              // Fetch full campaign details to get accurate remaining emails count
              const fullCampaign = await CampaignsApi.get(c.id);
              
              // Estimate remaining emails (cancelled + incomplete)
              // We need to calculate how many emails will be re-queued
              // For now, estimate based on campaign size and progress
              const totalExpectedEmails = (c.totalRecipients || 0) * (c.totalSteps || 0);
              const sentEmails = c.emailsSent || 0;
              const remainingEmails = Math.max(0, totalExpectedEmails - sentEmails);
              
              // If there are remaining emails, check quota
              if (remainingEmails > 0) {
                const quotaResponse = await userService.getQuotaStats(user.id);
                if (quotaResponse.success && quotaResponse.data) {
                  const stats = quotaResponse.data;
                  if (remainingEmails > stats.remaining) {
                    // Show quota warning dialog
                    setQuotaStats(stats);
                    setPendingActivation({ campaign: c, totalEmails: remainingEmails });
                    setQuotaDialogOpen(true);
                    return; // Don't resume yet, wait for user confirmation
                  }
                }
              }
            } catch (quotaError) {
              console.warn('Could not fetch quota stats, proceeding with resume:', quotaError);
            }
          }
          
          // Resume the paused campaign (re-queues cancelled emails)
          updated = await CampaignsApi.resume(c.id, 'auto-spread');
          toast.success(`Campaign "${c.name}" resumed! Emails are being queued...`);
        } else {
          // Activate a DRAFT campaign - check quota first
          if (user?.id && c.totalRecipients && (c.totalSteps || 0) > 0) {
            try {
              // Fetch full campaign details to get accurate steps count
              const fullCampaign = await CampaignsApi.get(c.id);
              const stepsCount = fullCampaign?.steps?.length || c.totalSteps || 0;
              const totalRecipients = fullCampaign?.totalRecipients || c.totalRecipients || 0;
              const totalEmails = totalRecipients * stepsCount;
              
              const quotaResponse = await userService.getQuotaStats(user.id);
              if (quotaResponse.success && quotaResponse.data) {
                const stats = quotaResponse.data;
                if (totalEmails > stats.remaining) {
                  // Show quota warning dialog
                  setQuotaStats(stats);
                  setPendingActivation({ campaign: c, totalEmails });
                  setQuotaDialogOpen(true);
                  return; // Don't activate yet, wait for user confirmation
                }
              }
            } catch (quotaError) {
              console.warn('Could not fetch quota stats, proceeding with activation:', quotaError);
            }
          }
          
          // Activate the campaign (either quota is sufficient or check failed)
          await checkQuotaAndActivate(c);
          return;
        }
      } else {
        // Pause the campaign (only if currently ACTIVE)
        if (c.status === 'ACTIVE') {
        updated = await CampaignsApi.pause(c.id);
        toast.info(`Campaign "${c.name}" paused.`);
        } else {
          // Can't pause a non-active campaign
          return;
        }
      }
      
      // Update the campaign in the list with new status
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
      
      // Refresh campaigns to get latest data
      loadCampaigns(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update campaign');
      // Force reload to get correct state
      const isEmployee = user?.type === 'employee';
      if (user && (!isEmployee ? user.organizationId : true)) {
        const params: any = { page, limit };
        if (searchTerm) params.searchTerm = searchTerm;
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        // Only add organizationId for regular users - employees get it from apiService
        if (!isEmployee && user.organizationId) {
          params.organizationId = user.organizationId;
        }
        CampaignsApi.list(params).then((res: any) => {
          if (res?.success && res?.data) {
            setItems(res.data.data || []);
          }
        });
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex gap-2 items-center w-full md:w-auto">
          <Input placeholder="Search campaigns..." value={searchTerm} onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }} className="w-full md:w-64" />
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="PAUSED">PAUSED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canPerformAction(ActionType.CREATE) && (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setGmailModalOpen(true)}
                  className="h-9 w-9"
                >
                  {hasGmailScopes === true ? (
                    <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasGmailScopes === true 
                  ? "Gmail permissions granted - Click to view details"
                  : "Gmail permissions required - Click to grant access"}
              </TooltipContent>
            </Tooltip>
            <Button 
              onClick={() => navigate('/dashboard/campaigns/new')}
              disabled={hasGmailScopes !== true}
            >
              New Campaign
            </Button>
          </div>
        )}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <NoDataState
          icon={<FileText className="h-12 w-12 text-muted-foreground" />}
          title="No campaigns found"
          description="Create your first campaign to get started."
        />
      ) : (
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          <div className="overflow-auto flex-1 border rounded-md shadow-xs">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background">
                <TableRow>
                  <TableHead className="text-left py-1 px-2">Name</TableHead>
                  <TableHead className="text-left py-1 px-2">Status</TableHead>
                  <TableHead className="text-left py-1 px-2">Progress</TableHead>
                  <TableHead className="text-left py-1 px-2">Created</TableHead>
                  <TableHead className="text-left py-1 px-2">Owner</TableHead>
                  <TableHead className="text-left py-1 px-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <CampaignRow 
                    key={c.id} 
                    campaign={c} 
                    onToggleActive={toggleActive}
                    navigate={navigate}
                    onDelete={handleDeleteClick}
                    canPerformAction={canPerformAction}
                    timezone={timezone}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {!loading && (
            <div className="mt-2 flex-shrink-0">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {totalItems > 0 && (
                    <span>
                      Showing {(() => {
                        const start = (page - 1) * limit + 1;
                        const end = Math.min(start + (items?.length || 0) - 1, totalItems);
                        return `${start} to ${end} of ${totalItems} entries`;
                      })()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select value={String(limit)} onValueChange={(v) => { setPage(1); setLimit(parseInt(v)); }}>
                      <SelectTrigger className="h-8 w-[70px] cursor-pointer">
                        <SelectValue placeholder={limit} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        <SelectItem value="10" className="cursor-pointer">10</SelectItem>
                        <SelectItem value="20" className="cursor-pointer">20</SelectItem>
                        <SelectItem value="25" className="cursor-pointer">25</SelectItem>
                        <SelectItem value="50" className="cursor-pointer">50</SelectItem>
                        <SelectItem value="100" className="cursor-pointer">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {page} of {Math.max(totalPages, 1)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex cursor-pointer"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                    >
                      <span className="sr-only">Go to first page</span>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <span className="sr-only">Go to previous page</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                    >
                      <span className="sr-only">Go to next page</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex cursor-pointer"
                      onClick={() => setPage(totalPages || 1)}
                      disabled={page >= totalPages}
                    >
                      <span className="sr-only">Go to last page</span>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={async () => {
          if (!campaignToDelete) return;
          
          try {
            const response = await CampaignsApi.remove(campaignToDelete.id);
            if (response?.success) {
              toast.success("Campaign deleted successfully");
              setItems((prev) => prev.filter(i => i.id !== campaignToDelete.id));
              loadCampaigns(false);
            } else {
              const errorMessage = response?.message || response?.error?.details || "Failed to delete campaign";
              toast.error(errorMessage as string);
            }
          } catch (error: any) {
            const errorMessage = error?.message || error?.response?.data?.message || "Failed to delete campaign";
            toast.error(errorMessage);
          } finally {
            setIsDeleteDialogOpen(false);
            setCampaignToDelete(null);
          }
        }}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setCampaignToDelete(null);
        }}
        title="Delete Campaign"
        description={`Are you sure you want to delete "${campaignToDelete?.name}"?`}
        itemName={campaignToDelete?.name}
        itemType="campaign"
      />
      
      {/* Quota Warning Dialog for Campaign Activation */}
      {pendingActivation && quotaStats && (
        <QuotaModeSelectionDialog
          isOpen={quotaDialogOpen}
          onOpenChange={setQuotaDialogOpen}
          onConfirm={async () => {
            await checkQuotaAndActivate(pendingActivation.campaign);
          }}
          onCancel={() => {
            setQuotaDialogOpen(false);
            setPendingActivation(null);
          }}
          quotaStats={quotaStats}
          totalEmails={pendingActivation.totalEmails}
          estimatedDays={quotaStats ? Math.max(1, Math.ceil((pendingActivation.totalEmails - quotaStats.remaining) / quotaStats.limit)) : 1}
        />
      )}

      {/* Gmail Scope Modal */}
      <GmailScopeModal
        open={gmailModalOpen}
        onOpenChange={setGmailModalOpen}
        hasScopes={hasGmailScopes === true}
        onAuthorize={() => setGmailModalOpen(false)}
      />
    </div>
  );
}

// Separate component for each campaign row with real-time progress
function CampaignRow({ 
  campaign, 
  onToggleActive,
  navigate,
  onDelete,
  canPerformAction,
  timezone
}: { 
  campaign: Campaign; 
  onToggleActive: (c: Campaign, checked: boolean) => void;
  navigate: (path: string) => void;
  onDelete: (campaign: Campaign) => void;
  canPerformAction: (action: ActionType) => boolean;
  timezone: string;
}) {
  // Enable real-time progress for active campaigns
  const isActive = campaign.status === 'ACTIVE';
  const { campaignProgress, isConnected } = useCampaignProgress(isActive ? campaign.id : null);

  // Use backend-provided progress values (no calculations in UI)
  // Use emailsCompleted (sent + bounced + failed) to match progress calculation
  const sentEmails = campaign.emailsCompleted ?? campaign.emailsSent ?? 0;
  const expectedEmails = campaign.totalExpectedEmails ?? (campaign.totalRecipients || 0) * (campaign.totalSteps || 0);
  const percentage = campaign.progressPercentage ?? 0;

  return (
    <TableRow>
      <TableCell className="font-medium text-left py-1 px-2">
        <div className="flex items-center gap-2">
          <Switch 
            checked={campaign.status === 'ACTIVE'} 
            onCheckedChange={(checked) => onToggleActive(campaign, checked)} 
            disabled={campaign.status === 'COMPLETED' || (campaign.totalSteps || 0) === 0}
            title={
              campaign.status === 'COMPLETED' 
                ? 'Campaign completed - cannot be reactivated' 
                : (campaign.totalSteps || 0) === 0
                ? 'Add at least one step to activate this campaign'
                : undefined
            }
          />
          <span className={campaign.status === 'COMPLETED' ? 'opacity-50' : ''}>
            {campaign.name}
          </span>
          {/* Live indicator when receiving real-time updates */}
          {isActive && isConnected && (
            <span className="relative flex h-2 w-2" title="Receiving real-time updates">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-left py-1 px-2">
        <Badge variant="secondary">{campaign.status}</Badge>
      </TableCell>
      <TableCell className="text-left py-1 px-2">
        {campaign.status === 'DRAFT' ? (
          <Badge variant="secondary" className="text-xs">
            NA
          </Badge>
        ) : expectedEmails === 0 ? (
          <span className="text-sm text-muted-foreground">Not started</span>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={percentage >= 100 ? "default" : "secondary"} className="text-xs">
              {campaign.status === 'ACTIVE' && percentage < 100 && (
                <Spinner className="size-3 mr-1" />
              )}
              {Math.round(percentage)}%
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {Math.min(sentEmails, expectedEmails)}/{expectedEmails}
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-left py-1 px-2">
        {(() => {
          const createdAt = campaign.createdAt;
          if (!createdAt) {
            return <span className="text-sm text-muted-foreground" title="Creation date not available">-</span>;
          }
          
          try {
            const formatted = formatDateTime(createdAt, timezone);
            return (
              <span className="text-sm" title={`Created: ${formatted} (${timezone})`}>
                {formatted}
              </span>
            );
          } catch (error) {
            console.error('Error formatting campaign created date:', error, createdAt);
            return <span className="text-sm text-muted-foreground">-</span>;
          }
        })()}
      </TableCell>
      <TableCell className="text-left py-1 px-2">
        {campaign.creator ? `${campaign.creator.firstName || ''} ${campaign.creator.lastName || ''}`.trim() || campaign.creator.email : '-'}
      </TableCell>
      <TableCell className="text-left py-1 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/dashboard/campaigns/${campaign.id}?view=true`)}>View</DropdownMenuItem>
            {canPerformAction(ActionType.UPDATE) && (
              <DropdownMenuItem onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}>Edit</DropdownMenuItem>
            )}
            {canPerformAction(ActionType.DELETE) && (campaign.status === 'DRAFT' || campaign.status === 'COMPLETED') && (
              <DropdownMenuItem 
                className="text-red-600" 
                onClick={() => onDelete(campaign)}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

