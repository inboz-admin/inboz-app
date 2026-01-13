import { useEffect, useMemo, useState, useCallback } from 'react';
import { CampaignsApi } from '../../api/campaigns';
import type { Campaign, CampaignStep } from '../../api/campaigns';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { emailTemplateService } from '@/api/emailTemplateService';
import { contactListService } from '@/api/contactListService';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { StepModal } from './StepModal';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { useCampaignProgress } from '@/hooks/useCampaignProgress';
import { Spinner } from '@/components/ui/spinner';
import { EmailMessagesModal } from './EmailMessagesModal';
import { CampaignMetricsModal } from './CampaignMetricsModal';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { QuotaModeSelectionDialog } from '@/components/campaigns/QuotaModeSelectionDialog';
import { QuotaWarningDialog } from '@/components/campaigns/QuotaWarningDialog';
import { userService } from '@/api/userService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CampaignBuilderPage() {
  const [campaign, setCampaign] = useState<Partial<Campaign>>({ 
    status: 'DRAFT',
    openTracking: true,
    clickTracking: true,
    unsubscribeTracking: true,
    unsubscribeReplyEnabled: false,
  } as any);
  const [steps, setSteps] = useState<CampaignStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string; contactCount?: number }[]>([]);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<CampaignStep | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalStepId, setEmailModalStepId] = useState<string | null>(null);
  const [emailModalEventType, setEmailModalEventType] = useState<'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'UNSUBSCRIBED' | undefined>(undefined);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [isDeleteStepDialogOpen, setIsDeleteStepDialogOpen] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<CampaignStep | null>(null);
  const [overdueStepsAlertOpen, setOverdueStepsAlertOpen] = useState(false);
  const [overdueSteps, setOverdueSteps] = useState<Array<{ stepId: string; stepName: string; scheduleTime: Date }>>([]);
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [quotaStats, setQuotaStats] = useState<{
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
    percentUsed: number;
    targetDate?: string; // Optional target date for scheduled steps
  } | null>(null);
  const [pendingActivation, setPendingActivation] = useState(false);
  const [quotaWarningDialogOpen, setQuotaWarningDialogOpen] = useState(false);
  const [quotaWarningStats, setQuotaWarningStats] = useState<{
    stats: {
      used: number;
      limit: number;
      remaining: number;
      resetAt: string;
      percentUsed: number;
    };
    emailsForNewStep: number;
    totalEmailsWithNewStep: number;
    estimatedDays: number;
    targetDate?: string;
  } | null>(null);
  const [pendingStepData, setPendingStepData] = useState<Partial<CampaignStep> | null>(null);
  const [stepQueuedEmails, setStepQueuedEmails] = useState<Record<string, Array<{ scheduledSendAt?: string | null }>>>({});
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppStore();

  const effectiveOrgId = campaign.organizationId || user?.organizationId || '';
  const canSave = useMemo(() => !!effectiveOrgId && !!campaign?.name && !!(campaign as any).contactListId, [effectiveOrgId, campaign]);

  // Enable real-time progress for active campaigns
  const isActive = campaign.status === 'ACTIVE';
  const { campaignProgress: realtimeProgress, isConnected } = useCampaignProgress(isActive && campaign.id ? campaign.id : null);

  // Function to load queued emails for each step
  const loadStepQueuedEmails = useCallback(async () => {
    if (!campaign?.id || !steps.length) return;
    
    const stepEmailsMap: Record<string, Array<{ scheduledSendAt?: string | null }>> = {};
    
    // Fetch queued emails for each step
    await Promise.all(
      steps.map(async (step) => {
        try {
          const emails = await CampaignsApi.getStepEmails(campaign.id!, step.id);
          const emailList = Array.isArray(emails?.data || emails) ? (emails?.data || emails) : [];
          // Filter only QUEUED or SENDING emails
          const queuedEmails = emailList.filter((email: any) => 
            email.status === 'QUEUED' || email.status === 'SENDING'
          );
          stepEmailsMap[step.id] = queuedEmails;
        } catch (err) {
          console.error(`Failed to load queued emails for step ${step.id}:`, err);
          stepEmailsMap[step.id] = [];
        }
      })
    );
    
    setStepQueuedEmails(stepEmailsMap);
  }, [campaign?.id, steps]);

  // Function to load campaign data
  const loadCampaign = useCallback(() => {
    if (!id || !user?.organizationId) return;
    CampaignsApi.get(id)
      .then((c) => {
        if (c) {
          // Ensure default values for tracking settings
          const campaignData = {
            ...c,
            openTracking: c.openTracking ?? true,
            clickTracking: c.clickTracking ?? true,
            unsubscribeTracking: c.unsubscribeTracking ?? true,
            unsubscribeReplyEnabled: c.unsubscribeReplyEnabled ?? false,
          } as any;
          setCampaign(campaignData);
          const sts = ((c as any)?.steps || []) as CampaignStep[];
          const filteredSteps = sts.filter(s => s && s.id);
          setSteps(filteredSteps); // Filter out any null/undefined steps
          
          // Load queued emails if campaign is active
          if (c.status === 'ACTIVE' && c.id && filteredSteps.length > 0) {
            // Set campaign and steps first, then load emails after a short delay
            setTimeout(() => {
              setCampaign(c as any); // Ensure campaign is set
              setSteps(filteredSteps); // Ensure steps are set
              // Load emails will be triggered by useEffect when status/steps change
            }, 100);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load campaign:', err);
        // Don't show error toast on polling, only on initial load
      });
  }, [id, user?.organizationId]);

  // Load options & existing campaign if editing
  useEffect(() => {
    const orgId = user?.organizationId;
    if (orgId) {
      emailTemplateService.getTemplates({ organizationId: orgId, page: 1, limit: 100 }).then((r: any) => {
        const arr = (r?.data ?? []) as any[];
        setTemplates(arr.map((t: any) => ({ id: t.id, name: t.name })));
      }).catch(() => setTemplates([]));
      contactListService.getContactLists({ organizationId: orgId, page: 1, limit: 100 }).then((r: any) => {
        const arr = (r?.data?.data ?? r?.data ?? []) as any[];
        setLists(arr.map((l: any) => ({ id: l.id, name: l.name, contactCount: l.contactCount || 0 })));
      }).catch(() => setLists([]));
    }
    if (id && orgId) {
      loadCampaign();
    } else {
      setCampaign((prev) => ({ ...prev, organizationId: orgId }));
    }
  }, [id, user?.organizationId]);

  // Poll campaign data every 1 minute (only when viewing a campaign)
  useEffect(() => {
    if (!id || !user?.organizationId) return;

    // Set up polling interval (1 minute = 60000ms)
    const interval = setInterval(() => {
      loadCampaign();
    }, 60000);

    // Cleanup interval on unmount or when id changes
    return () => clearInterval(interval);
  }, [id, user?.organizationId, loadCampaign]);

  // Reload queued emails when campaign becomes active or steps change
  useEffect(() => {
    if (campaign?.status === 'ACTIVE' && campaign?.id && steps.length > 0) {
      loadStepQueuedEmails();
    }
  }, [campaign?.status, campaign?.id, steps.map(s => s.id).join(','), loadStepQueuedEmails]);

  const onSave = async () => {
    if (!canSave) return;
    
    // Validate custom unsubscribe message if reply unsubscribe is enabled
    if (campaign.unsubscribeReplyEnabled && !campaign.unsubscribeCustomMessage?.trim()) {
      toast.error('Custom unsubscribe message is required when custom reply unsubscribe is enabled');
      return;
    }
    
    setSaving(true);
    try {
      if (campaign.id) {
        // Prepare update payload with all settings
        const updatePayload = {
          ...campaign,
          // Ensure all tracking settings are included
          openTracking: campaign.openTracking ?? true,
          clickTracking: campaign.clickTracking ?? true,
          unsubscribeTracking: campaign.unsubscribeTracking ?? true,
          unsubscribeReplyEnabled: campaign.unsubscribeReplyEnabled ?? false,
          unsubscribeCustomMessage: campaign.unsubscribeCustomMessage || null,
        } as any;
        
        const updated = await CampaignsApi.update(campaign.id, updatePayload);
        
        // Ensure all settings are properly set with latest data from server
        const campaignData = {
          ...updated,
          openTracking: updated.openTracking ?? true,
          clickTracking: updated.clickTracking ?? true,
          unsubscribeTracking: updated.unsubscribeTracking ?? true,
          unsubscribeReplyEnabled: updated.unsubscribeReplyEnabled ?? false,
          unsubscribeCustomMessage: updated.unsubscribeCustomMessage,
        } as any;
        setCampaign(campaignData);
        toast.success('Campaign updated successfully');
      } else {
        const payload = {
          ...campaign,
          organizationId: effectiveOrgId,
        } as any;
        const created = await CampaignsApi.create(payload);
        if (created && (created as any).id) {
          setCampaign(created);
          toast.success('Campaign created successfully');
          navigate(`/dashboard/campaigns/${(created as any).id}`);
        }
      }
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      
      // Handle 409 Conflict errors (duplicate campaign name)
      if (error?.statusCode === 409 || error?.error?.code === 'CONFLICT') {
        const errorMessage = error?.message || error?.error?.details?.message || 'A campaign with this name already exists in your organization';
        toast.error(errorMessage);
      } else {
        // Generic error for other cases
        toast.error(error?.message || 'Failed to save campaign');
      }
    } finally {
      setSaving(false);
    }
  };

  const checkQuotaAndActivate = async () => {
    if (!campaign?.id || !user?.id) return;
    
    try {
      setPendingActivation(false);
      setQuotaDialogOpen(false);
      
      // Activate a DRAFT campaign (creates jobs in queue) - always use auto-spread mode
      console.log('🟢 Activating campaign with auto-spread mode');
      await CampaignsApi.activate(campaign.id, 'auto-spread');
      console.log('✅ Campaign activated');
      
      // Refresh campaign detail page to get all updated data (status, steps, quota distribution, etc.)
      // Small delay to ensure backend has processed the activation
      setTimeout(async () => {
        await loadCampaign();
      }, 500);
      
      toast.success(`Campaign "${campaign.name}" activated! Emails are being queued...`);
    } catch (error: any) {
      console.error('❌ Error activating campaign:', error);
      toast.error(error?.message || 'Failed to activate campaign');
      // Refresh campaign data even on error to get current state
      if (campaign.id) {
        loadCampaign();
      }
    }
  };

  const toggleActive = async (checked: boolean) => {
    if (!campaign?.id) return;
    
    console.log('🔄 toggleActive called:', { 
      checked, 
      currentStatus: campaign.status,
      campaignId: campaign.id 
    });
    
    // Don't allow toggling completed campaigns
    if (campaign.status === 'COMPLETED') {
      toast.error('Cannot activate a completed campaign');
      return;
    }
    
    try {
      let updated;
      if (checked) {
        // Activate or resume the campaign
        if (campaign.status === 'PAUSED') {
          // Resume the paused campaign (re-queues cancelled emails)
          console.log('▶️ Resuming campaign...');
          updated = await CampaignsApi.resume(campaign.id);
          console.log('✅ Campaign resumed:', updated);
          
          // Check if there are overdue scheduled steps
          const overdueStepsData = (updated as any)?.overdueSteps;
          if (overdueStepsData && overdueStepsData.length > 0) {
            setOverdueSteps(overdueStepsData);
            setOverdueStepsAlertOpen(true);
          } else {
            toast.success(`Campaign "${campaign.name}" resumed! Emails are being queued...`);
          }
        } else {
          // Activate a DRAFT campaign - check quota first
          if (!user?.id) {
            toast.error('User information not available');
            return;
          }

          // Check if campaign has scheduled steps - if so, check quota for scheduled date
          const scheduledSteps = steps.filter(
            step => step.triggerType === 'SCHEDULE' && step.scheduleTime
          );
          
          // Find the earliest scheduled date (if any scheduled steps exist)
          let targetDate: Date | undefined = undefined;
          if (scheduledSteps.length > 0) {
            const scheduledDates = scheduledSteps
              .map(step => new Date(step.scheduleTime!))
              .filter(date => !isNaN(date.getTime()))
              .sort((a, b) => a.getTime() - b.getTime());
            
            if (scheduledDates.length > 0) {
              // Use the earliest scheduled date
              targetDate = scheduledDates[0];
              
              // Extract date components and create UTC date at midnight for quota check
              const year = targetDate.getUTCFullYear();
              const month = targetDate.getUTCMonth();
              const day = targetDate.getUTCDate();
              targetDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            }
          }

          // Get quota stats (for today or scheduled date)
          try {
            const quotaResponse = await userService.getQuotaStats(user.id, targetDate);
            if (quotaResponse.success && quotaResponse.data) {
              const stats = quotaResponse.data;
              
              // Calculate total emails needed
              const totalEmails = (campaign.totalRecipients || 0) * steps.length;
              
              // Check if quota might be insufficient
              if (totalEmails > stats.remaining) {
                // Show quota dialog with target date info
                setQuotaStats({
                  ...stats,
                  targetDate: targetDate ? targetDate.toISOString() : undefined,
                });
                setPendingActivation(true);
                setQuotaDialogOpen(true);
                return; // Don't activate yet, wait for user to choose mode
              }
            }
          } catch (quotaError) {
            console.warn('Could not fetch quota stats, proceeding with activation:', quotaError);
            // Continue with activation if quota check fails
          }
          
          // Proceed with activation (quota sufficient or check failed)
          await checkQuotaAndActivate();
          return;
        }
      } else {
        // Pause the campaign (only if currently ACTIVE)
        if (campaign.status === 'ACTIVE') {
          console.log('⏸️ Pausing campaign...');
          updated = await CampaignsApi.pause(campaign.id);
          console.log('⏸️ Campaign paused:', updated);
          toast.info(`Campaign "${campaign.name}" paused.`);
        } else {
          // Can't pause a non-active campaign
          return;
        }
      }
      
      // Update the campaign status
      setCampaign((prev) => ({ ...prev, ...updated }));
      // Refresh steps to get updated progress
      if (updated) {
        const refreshed = await CampaignsApi.get(campaign.id);
        if (refreshed) {
          const sts = ((refreshed as any)?.steps || []) as CampaignStep[];
          setSteps(sts.filter(s => s && s.id));
          setCampaign(refreshed as any);
        }
      }
    } catch (error: any) {
      console.error('❌ Error in toggleActive:', error);
      toast.error(error?.message || 'Failed to update campaign');
      // Refresh campaign data
      if (campaign.id) {
        CampaignsApi.get(campaign.id)
          .then((c) => {
            if (c) {
              setCampaign(c as any);
              const sts = ((c as any)?.steps || []) as CampaignStep[];
              setSteps(sts.filter(s => s && s.id)); // Filter out any null/undefined steps
            }
          })
          .catch((err) => {
            console.error('Failed to refresh campaign:', err);
          });
      }
    }
  };

  const handleSaveStep = async (stepData: Partial<CampaignStep>) => {
    if (!campaign.id || !campaign.organizationId) return;
    
    try {
      // Check quota before adding step to active campaign
      if (!editingStep?.id && campaign.status === 'ACTIVE' && user?.id && campaign.totalRecipients) {
        try {
          // If step is scheduled for a future date, check quota for that specific day
          const targetDate = stepData.triggerType === 'SCHEDULE' && stepData.scheduleTime
            ? new Date(stepData.scheduleTime)
            : undefined;
          
          const quotaResponse = await userService.getQuotaStats(user.id, targetDate);
          if (quotaResponse.success && quotaResponse.data) {
            const stats = quotaResponse.data;
            const emailsForNewStep = campaign.totalRecipients;
            const totalEmailsWithNewStep = campaign.totalRecipients * (steps.length + 1);
            
            // Show warning modal if quota is insufficient
            if (emailsForNewStep > stats.remaining || totalEmailsWithNewStep > stats.remaining) {
              const estimatedDays = Math.max(1, Math.ceil((totalEmailsWithNewStep - stats.remaining) / stats.limit));
              
              // Store step data and quota info, then show warning dialog
              setPendingStepData(stepData);
              setQuotaWarningStats({
                stats,
                emailsForNewStep,
                totalEmailsWithNewStep,
                estimatedDays,
                targetDate: targetDate ? targetDate.toISOString() : undefined,
              });
              setQuotaWarningDialogOpen(true);
              return; // Don't add step yet, wait for user confirmation
            }
          }
        } catch (quotaError) {
          console.warn('Could not check quota before adding step:', quotaError);
          // Continue with step addition even if quota check fails
        }
      }
      
      // Proceed with step addition
      await addStepInternal(stepData);
    } catch (err: any) {
      console.error('Error saving step:', err);
      
      // Handle 409 Conflict errors (duplicate step name)
      if (err?.statusCode === 409 || err?.error?.code === 'CONFLICT') {
        const errorMessage = err?.message || err?.error?.details?.message || 'A sequence with this name already exists in this campaign';
        toast.error(errorMessage);
      } else {
        // Extract error message from various error formats for other errors
        const errorMessage = 
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save sequence. Please try again.';
        
        toast.error(errorMessage);
      }
    }
  };

  const addStepInternal = async (stepData: Partial<CampaignStep>) => {
    if (!campaign.id || !campaign.organizationId) return;
    
    try {
      let result;
      if (editingStep?.id) {
        // Update existing step
        result = await CampaignsApi.updateStep(campaign.id, editingStep.id, stepData);
      } else {
        // Add new step
        result = await CampaignsApi.addStep(campaign.id, {
          organizationId: campaign.organizationId!,
          ...stepData,
        } as any);
      }
      
      // Check if result indicates an error (NestJS returns { success: false, statusCode, message })
      if (result && (result.statusCode >= 400 || result.success === false)) {
        // Handle 409 Conflict errors (duplicate step name)
        if (result.statusCode === 409 || result.error?.code === 'CONFLICT') {
          const errorMessage = result.message || result.error?.details?.message || 'A sequence with this name already exists in this campaign';
          toast.error(errorMessage);
        } else {
          const errorMessage = result.message || 'Failed to save step. Please try again.';
          toast.error(errorMessage);
        }
        return;
      }
      
      setStepModalOpen(false);
      setEditingStep(null);
      setPendingStepData(null);
      
      // Show success message
      if (editingStep?.id) {
        toast.success('Step updated successfully');
      } else {
        toast.success('Step added successfully');
      }
      
      // Fetch campaign details after toast to get latest data (scheduled emails, etc.)
      // Small delay to ensure backend has processed the step addition
      setTimeout(async () => {
        await loadCampaign();
      }, 500);
    } catch (err: any) {
      console.error('Error saving step:', err);
      
      // Handle 409 Conflict errors (duplicate step name)
      if (err?.statusCode === 409 || err?.error?.code === 'CONFLICT') {
        const errorMessage = err?.message || err?.error?.details?.message || 'A sequence with this name already exists in this campaign';
        toast.error(errorMessage);
      } else {
        // Try multiple ways to extract error message for other errors
        const errorMessage = 
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          (typeof err === 'string' ? err : 'Failed to save step. Please try again.');
        
        toast.error(errorMessage);
      }
    }
  };

  const handleConfirmQuotaWarning = async () => {
    setQuotaWarningDialogOpen(false);
    if (pendingStepData) {
      await addStepInternal(pendingStepData);
    }
  };

  const handleCancelQuotaWarning = () => {
    setQuotaWarningDialogOpen(false);
    setPendingStepData(null);
    setQuotaWarningStats(null);
  };

  const handleEditStep = (step: CampaignStep) => {
    // Check if step can be edited
    if (!canEditStep(step)) {
      toast.error('Cannot edit steps while campaign is running. Please pause the campaign first.');
      return;
    }
    setEditingStep(step);
    setStepModalOpen(true);
  };

  const handleDeleteStep = (step: CampaignStep) => {
    setStepToDelete(step);
    setIsDeleteStepDialogOpen(true);
  };

  const handleConfirmDeleteStep = async () => {
    if (!campaign.id || !stepToDelete) return;
    
    try {
      const response = await CampaignsApi.deleteStep(campaign.id, stepToDelete.id);
      
      if (response?.success) {
        toast.success('Step deleted successfully');
        // Refresh the campaign to get updated steps
        const refreshed = await CampaignsApi.get(campaign.id);
        if (refreshed) {
          const sts = ((refreshed as any)?.steps || []) as CampaignStep[];
          setSteps(sts.filter(s => s && s.id)); // Filter out any null/undefined steps
          setCampaign(refreshed as any);
        }
      } else {
        const errorMessage = response?.message || response?.error?.details || 'Failed to delete step';
        toast.error(String(errorMessage));
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to delete step';
      toast.error(errorMessage);
      console.error('Error deleting step:', err);
    } finally {
      setIsDeleteStepDialogOpen(false);
      setStepToDelete(null);
    }
  };

  const getTemplateName = (templateId: string | null | undefined) => {
    if (!templateId || !Array.isArray(templates)) return '-';
    const template = templates.find((t) => t && t.id === templateId);
    return template?.name || '-';
  };

  const formatScheduleTime = (step: CampaignStep) => {
    if (!step) return '-';
    if (step.triggerType === 'IMMEDIATE') return 'Immediate';
    if (!step.scheduleTime) return 'Schedule (Not set)';
    try {
      const date = new Date(step.scheduleTime);
      if (isNaN(date.getTime())) return step.scheduleTime;
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return step.scheduleTime || '-';
    }
  };

  const formatDelay = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Check if a step has been processed (has emails created)
  const stepHasBeenProcessed = (step: CampaignStep): boolean => {
    return (step.emailsSent ?? 0) > 0 || 
           (step.emailsQueued ?? 0) > 0 || 
           (step.totalExpected ?? 0) > 0;
  };

  // Check if a step can be edited (scheduled steps that haven't started can be edited even when ACTIVE)
  const canEditStep = (step: CampaignStep): boolean => {
    if (campaign.status !== 'ACTIVE') return true;
    
    // Check if step has been processed
    const hasBeenProcessed = stepHasBeenProcessed(step);
    
    // Allow editing scheduled steps that haven't been processed yet
    const isScheduledStep = step.triggerType === 'SCHEDULE';
    return isScheduledStep && !hasBeenProcessed;
  };

  // Use backend-provided progress values
  const formatProgress = (step: CampaignStep) => {
    if (!step) return { pct: 0, sent: 0, total: 0 };
    // Use backend-calculated values
    // emailsCompleted includes sent + bounced + failed (matches progress calculation)
    const sent = (step as any).emailsCompleted ?? (step.emailsSent || 0);
    // Use nullish coalescing (??) instead of || to handle 0 as a valid value
    // For reply steps with 0 emails, totalExpected is correctly 0, not undefined
    const total = (step as any).totalExpected ?? campaign?.totalRecipients ?? 0;
    const pct = (step as any).progressPercentage ?? 0;
    return { pct: Math.round(pct), sent, total };
  };

  // Note: Add Sequence button is always enabled
  // Backend validation will check:
  // 1. All previous sequences are completed, OR
  // 2. Last sequence's last email scheduledSendAt has passed current time

  // Use backend-provided campaign progress
  const totalExpectedEmails = campaign.totalExpectedEmails ?? (campaign.totalRecipients || 0) * (steps.length || 0);
  const campaignProgress = campaign.progressPercentage ?? 0;
  // Use emailsCompleted (sent + bounced + failed) to match progress calculation
  const campaignSentEmails = (campaign as any).emailsCompleted ?? campaign.emailsSent ?? 0;

  return (
    <div className="p-4 space-y-6">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Campaign Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Campaign Name *</Label>
              <Input placeholder="Campaign name" value={campaign.name || ''} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Contact List *</Label>
              <Select 
                value={(campaign as any).contactListId || ''} 
                onValueChange={(v) => setCampaign({ ...campaign, contactListId: v as any })}
                disabled={!!campaign.id}
              >
                <SelectTrigger className="w-full" disabled={!!campaign.id}>
                  <SelectValue placeholder="Select contact list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                      {l.contactCount !== undefined && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({l.contactCount.toLocaleString()} {l.contactCount === 1 ? 'contact' : 'contacts'})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!canSave || saving} onClick={onSave}>
              {saving ? 'Saving...' : campaign.id ? 'Update Campaign' : 'Create Campaign'}
            </Button>
            {campaign.id && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                  <Switch 
                    checked={campaign.status === 'ACTIVE'} 
                    onCheckedChange={toggleActive} 
                    disabled={campaign.status === 'COMPLETED' || steps.length === 0}
                    title={
                      campaign.status === 'COMPLETED' 
                        ? 'Campaign completed - cannot be reactivated' 
                        : steps.length === 0 
                        ? 'Add steps before activating campaign'
                        : undefined
                    }
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {campaign?.status === 'COMPLETED' 
                      ? 'Completed' 
                      : campaign?.status === 'ACTIVE' 
                      ? 'Active' 
                      : campaign?.status === 'PAUSED'
                      ? 'Paused'
                      : 'Draft'}
                  </span>
                  {/* Live indicator when receiving real-time updates */}
                  {isActive && isConnected && (
                    <span className="relative flex h-2 w-2" title="Receiving real-time updates">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Tracking & Unsubscribe Settings in Accordion */}
          <div className="pt-4 border-t">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tracking-unsubscribe-settings" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="text-left">
                    <Label className="text-base font-semibold">Tracking & Unsubscribe Settings</Label>
                    <p className="text-sm text-muted-foreground mt-1">Configure email tracking and unsubscribe options</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Tracking Settings Section */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">Tracking Settings</Label>
                        <p className="text-xs text-muted-foreground mt-1">Configure email tracking options</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={campaign.openTracking ?? true}
                            onCheckedChange={(checked) => setCampaign({ ...campaign, openTracking: checked })}
                          />
                          <div className="flex-1">
                            <Label className="font-normal cursor-pointer">Open Tracking</Label>
                            <p className="text-xs text-muted-foreground">Track when recipients open your emails</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={campaign.clickTracking ?? true}
                            onCheckedChange={(checked) => setCampaign({ ...campaign, clickTracking: checked })}
                          />
                          <div className="flex-1">
                            <Label className="font-normal cursor-pointer">Click Tracking</Label>
                            <p className="text-xs text-muted-foreground">Track when recipients click links in your emails</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unsubscribe Options Section */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">Unsubscribe Options</Label>
                        <p className="text-xs text-muted-foreground mt-1">Configure how recipients can unsubscribe</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={campaign.unsubscribeTracking ?? true}
                            onCheckedChange={(checked) => setCampaign({ ...campaign, unsubscribeTracking: checked })}
                          />
                          <div className="flex-1">
                            <Label className="font-normal cursor-pointer">Add Unsubscribe Link</Label>
                            <p className="text-xs text-muted-foreground">Automatically adds an unsubscribe link to all emails</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={campaign.unsubscribeReplyEnabled ?? false}
                            onCheckedChange={(checked) => {
                              setCampaign({ 
                                ...campaign, 
                                unsubscribeReplyEnabled: checked,
                                // Clear custom message if disabling
                                unsubscribeCustomMessage: checked ? campaign.unsubscribeCustomMessage : undefined
                              });
                            }}
                          />
                          <div className="flex-1">
                            <Label className="font-normal cursor-pointer">Enable Custom Reply Unsubscribe</Label>
                            <p className="text-xs text-muted-foreground">Allow recipients to unsubscribe by replying with a custom message</p>
                          </div>
                        </div>
                        {campaign.unsubscribeReplyEnabled && (
                          <div className="ml-8 space-y-2">
                            <Label htmlFor="unsubscribe-custom-message">Custom Unsubscribe Message *</Label>
                            <Textarea
                              id="unsubscribe-custom-message"
                              placeholder="Enter the message recipients should reply with to unsubscribe (e.g., 'UNSUBSCRIBE' or 'STOP')"
                              value={campaign.unsubscribeCustomMessage || ''}
                              onChange={(e) => setCampaign({ ...campaign, unsubscribeCustomMessage: e.target.value })}
                              className="min-h-[80px]"
                            />
                            {campaign.unsubscribeReplyEnabled && !campaign.unsubscribeCustomMessage?.trim() && (
                              <p className="text-xs text-destructive">Custom unsubscribe message is required when custom reply unsubscribe is enabled</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Performance Section - Analytics Only */}
          {campaign.id && (campaign.status === 'ACTIVE' || campaign.status === 'PAUSED' || campaign.status === 'COMPLETED') && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Performance</Label>
                  <p className="text-sm text-muted-foreground mt-1">Campaign performance analytics</p>
                </div>
                {totalExpectedEmails > 0 && (
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Progress:</span>
                      <Badge variant={campaignProgress >= 100 ? "default" : "secondary"} className="text-xs">
                        {campaign.status === 'ACTIVE' && campaignProgress < 100 && (
                          <Spinner className="size-3 mr-1" />
                        )}
                        {Math.round(campaignProgress)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {Math.min(campaignSentEmails, totalExpectedEmails)}/{totalExpectedEmails}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Open: <strong className="text-foreground">{(campaign.emailsOpened ?? 0) === 0 ? '-' : (campaign.emailsOpened ?? 0)}</strong></span>
                      <span>Click: <strong className="text-foreground">{(campaign.emailsClicked ?? 0) === 0 ? '-' : (campaign.emailsClicked ?? 0)}</strong></span>
                      <span>Reply: <strong className="text-foreground">{(campaign.emailsReplied ?? 0) === 0 ? '-' : (campaign.emailsReplied ?? 0)}</strong></span>
                      <span>Bounce: <strong className="text-foreground">{(campaign.emailsBounced ?? 0) === 0 ? '-' : (campaign.emailsBounced ?? 0)}</strong></span>
                      <span>Unsubscribe: <strong className="text-foreground">{(campaign.unsubscribes ?? 0) === 0 ? '-' : (campaign.unsubscribes ?? 0)}</strong></span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMetricsModalOpen(true)}
                        className="h-6 px-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {campaign.id && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Sequences</h3>
                </div>
                <Button onClick={() => { setEditingStep(null); setStepModalOpen(true); }}>
                  Add Sequence
                </Button>
              </div>
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sequences added yet. Click "Add Sequence" to create your first sequence.
                </div>
              ) : (
                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left w-12 py-1 px-2">#</TableHead>
                        <TableHead className="text-left py-1 px-2">Name</TableHead>
                        <TableHead className="text-left py-1 px-2">Template</TableHead>
                        <TableHead className="text-left py-1 px-2">Progress</TableHead>
                        <TableHead className="text-left py-1 px-2">Open</TableHead>
                        <TableHead className="text-left py-1 px-2">Click</TableHead>
                        <TableHead className="text-left py-1 px-2">Reply</TableHead>
                        <TableHead className="text-left py-1 px-2">Bounce</TableHead>
                        <TableHead className="text-left py-1 px-2">Cancelled</TableHead>
                        <TableHead className="text-left py-1 px-2">Unsubscribe</TableHead>
                        <TableHead className="text-left py-1 px-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {steps.filter(s => s && s.id).map((step, index) => (
                        <TableRow key={step.id}>
                          <TableCell className="text-left py-1 px-2">
                            <Badge variant="secondary">{step.stepOrder ?? index + 1}</Badge>
                          </TableCell>
                          <TableCell className="text-left font-medium py-1 px-2">
                            <div className="flex items-center gap-2">
                              <span>{step.name || `Sequence ${index + 1}`}</span>
                              {(step as any).replyToStepId && (() => {
                                // Find the step that this step is replying to (the step with id === replyToStepId)
                                const replyToStep = steps.find((s: any) => s?.id === (step as any).replyToStepId);
                                const replyType = (step as any).replyType;
                                // Show the step name (or stepOrder as fallback if no name)
                                const replyStepName = replyToStep 
                                  ? (replyToStep.name || `Sequence ${replyToStep.stepOrder ?? steps.findIndex((s: any) => s?.id === replyToStep.id) + 1}`)
                                  : '?';
                                return (
                                  <Badge variant="outline" className="text-xs">
                                    <span className="mr-1 text-muted-foreground">↩</span>
                                    Follow up to {replyStepName}
                                    {replyType && (
                                      <span className="ml-1 text-muted-foreground">
                                        ({replyType === 'OPENED' ? 'Opened' : 'Clicked'})
                                      </span>
                                    )}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">{getTemplateName(step.templateId)}</TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {(() => {
                              // Show progress for campaigns that have been started (ACTIVE, PAUSED, or COMPLETED)
                              // DRAFT campaigns without emails will show "Not started"
                              if (campaign.status === 'ACTIVE' || campaign.status === 'PAUSED' || campaign.status === 'COMPLETED') {
                                const progress = formatProgress(step);
                                // Show progress if:
                                // 1. Step has emails (total > 0), OR
                                // 2. Step is a reply step that was processed but had 0 contacts (totalExpected is explicitly 0, not undefined)
                                const isProcessedReplyStepWithZeroEmails = (step as any).replyToStepId && (step as any).totalExpected === 0;
                                
                                if (progress.total > 0 || isProcessedReplyStepWithZeroEmails) {
                                  // If step has 0/0 emails, show "NA" instead of percentage
                                  if (progress.total === 0 && progress.sent === 0) {
                                    return (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                          NA
                                        </Badge>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          0/0
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Badge variant={progress.pct >= 100 ? "default" : "secondary"} className="text-xs">
                                        {campaign.status === 'ACTIVE' && progress.pct < 100 && progress.total > 0 && (
                                          <Spinner className="size-3 mr-1" />
                                        )}
                                        {progress.pct}%
                                      </Badge>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {progress.sent}/{progress.total}
                                      </span>
                                    </div>
                                  );
                                } else {
                                  return <span className="text-sm text-muted-foreground">Not started</span>;
                                }
                              } else {
                                // Show "Not started" for DRAFT campaigns
                                return <span className="text-sm text-muted-foreground">Not started</span>;
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {(step.emailsOpened ?? 0) === 0 ? '-' : (step.emailsOpened ?? 0)}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {(step.emailsClicked ?? 0) === 0 ? '-' : (step.emailsClicked ?? 0)}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {(step.emailsReplied ?? 0) === 0 ? '-' : (step.emailsReplied ?? 0)}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {(step.emailsBounced ?? 0) === 0 ? '-' : (step.emailsBounced ?? 0)}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {((step as any).emailsCancelled ?? 0) === 0 ? '-' : ((step as any).emailsCancelled ?? 0)}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            {(step.unsubscribes ?? 0) === 0 ? '-' : (step.unsubscribes ?? 0)}
                          </TableCell>
                          <TableCell className="text-left py-1 px-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleEditStep(step)}
                                  disabled={!canEditStep(step)}
                                  title={(() => {
                                    if (canEditStep(step)) {
                                      if (campaign.status === 'ACTIVE' && step.triggerType === 'SCHEDULE') {
                                        return 'Edit scheduled step (not started yet)';
                                      }
                                      return 'Edit step';
                                    }
                                    return 'Cannot edit steps while campaign is running. Please pause the campaign first.';
                                  })()}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEmailModalStepId(step.id);
                                  setEmailModalEventType(undefined);
                                  setEmailModalOpen(true);
                                }}>
                                  Email Stats
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStep(step)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StepModal
        open={stepModalOpen}
        onClose={() => { setStepModalOpen(false); setEditingStep(null); }}
        onSave={handleSaveStep}
        templates={templates}
        editingStep={editingStep}
        existingSteps={steps}
        currentStepOrder={editingStep?.stepOrder}
      />

      {campaign.id && emailModalStepId && (
        <EmailMessagesModal
          open={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setEmailModalStepId(null);
            setEmailModalEventType(undefined);
          }}
          campaignId={campaign.id}
          stepId={emailModalStepId}
          eventType={emailModalEventType}
          stepName={steps.find(s => s.id === emailModalStepId)?.name || undefined}
        />
      )}

      {campaign.id && (
        <CampaignMetricsModal
          open={metricsModalOpen}
          onClose={() => setMetricsModalOpen(false)}
          campaign={campaign as Campaign}
        />
      )}

      {quotaStats && quotaDialogOpen && (
        <QuotaModeSelectionDialog
          isOpen={quotaDialogOpen}
          onOpenChange={setQuotaDialogOpen}
          onConfirm={checkQuotaAndActivate}
          onCancel={() => {
            setQuotaDialogOpen(false);
            setPendingActivation(false);
            setQuotaStats(null);
          }}
          quotaStats={quotaStats}
          totalEmails={(campaign.totalRecipients || 0) * steps.length}
          estimatedDays={quotaStats ? Math.max(1, Math.ceil(((campaign.totalRecipients || 0) * steps.length - quotaStats.remaining) / quotaStats.limit)) : 1}
        />
      )}

      <StepModal
        open={stepModalOpen}
        onClose={() => { setStepModalOpen(false); setEditingStep(null); }}
        onSave={handleSaveStep}
        templates={templates}
        editingStep={editingStep}
        existingSteps={steps}
        currentStepOrder={editingStep?.stepOrder}
      />

      {campaign.id && emailModalStepId && (
        <EmailMessagesModal
          open={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setEmailModalStepId(null);
            setEmailModalEventType(undefined);
          }}
          campaignId={campaign.id}
          stepId={emailModalStepId}
          eventType={emailModalEventType}
          stepName={steps.find(s => s.id === emailModalStepId)?.name || undefined}
        />
      )}

      {campaign.id && (
        <CampaignMetricsModal
          open={metricsModalOpen}
          onClose={() => setMetricsModalOpen(false)}
          campaign={campaign as Campaign}
        />
      )}

      {quotaStats && quotaDialogOpen && (
        <QuotaModeSelectionDialog
          isOpen={quotaDialogOpen}
          onOpenChange={setQuotaDialogOpen}
          onConfirm={checkQuotaAndActivate}
          onCancel={() => {
            setQuotaDialogOpen(false);
            setPendingActivation(false);
            setQuotaStats(null);
          }}
          quotaStats={quotaStats}
          totalEmails={(campaign.totalRecipients || 0) * steps.length}
          estimatedDays={quotaStats ? Math.max(1, Math.ceil(((campaign.totalRecipients || 0) * steps.length - quotaStats.remaining) / quotaStats.limit)) : 1}
        />
      )}

      {quotaWarningStats && quotaWarningDialogOpen && (
        <QuotaWarningDialog
          isOpen={quotaWarningDialogOpen}
          onOpenChange={setQuotaWarningDialogOpen}
          onConfirm={handleConfirmQuotaWarning}
          onCancel={handleCancelQuotaWarning}
          quotaStats={quotaWarningStats.stats}
          emailsForNewStep={quotaWarningStats.emailsForNewStep}
          totalEmailsWithNewStep={quotaWarningStats.totalEmailsWithNewStep}
          estimatedDays={quotaWarningStats.estimatedDays}
          targetDate={quotaWarningStats.targetDate}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={isDeleteStepDialogOpen}
        onOpenChange={setIsDeleteStepDialogOpen}
        onConfirm={handleConfirmDeleteStep}
        onCancel={() => {
          setIsDeleteStepDialogOpen(false);
          setStepToDelete(null);
        }}
        title="Delete Campaign Sequence"
        description={`Are you sure you want to delete "${stepToDelete?.name || `Sequence ${stepToDelete?.stepOrder}`}"?`}
        itemName={stepToDelete?.name || `Sequence ${stepToDelete?.stepOrder}`}
        itemType="campaign sequence"
      />

      <AlertDialog open={overdueStepsAlertOpen} onOpenChange={setOverdueStepsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Campaign Resumed with Overdue Sequences</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-3">
                Your campaign has been resumed successfully! However, {overdueSteps.length} scheduled sequence{overdueSteps.length > 1 ? 's' : ''} {overdueSteps.length > 1 ? 'were' : 'was'} overdue and {overdueSteps.length > 1 ? 'have' : 'has'} been processed immediately.
              </p>
              <div className="space-y-2">
                <p className="font-medium">Overdue Sequences:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {overdueSteps.map((step) => (
                    <li key={step.stepId}>
                      <strong>{step.stepName}</strong> - Scheduled for {new Date(step.scheduleTime).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-sm">
                These sequences will start sending emails immediately instead of waiting for their original schedule time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOverdueStepsAlertOpen(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
