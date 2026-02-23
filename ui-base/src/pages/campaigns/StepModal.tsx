import { useEffect, useState } from 'react';
import type { CampaignStep } from '../../api/campaigns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { format } from 'date-fns';
import { CommonTimezones } from '@/api/organizationTypes';

interface StepModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (step: Partial<CampaignStep>) => void;
  templates: { id: string; name: string }[];
  editingStep?: CampaignStep | null;
  existingSteps?: CampaignStep[]; // Previous steps in the campaign
  currentStepOrder?: number; // Current step order (for filtering previous steps)
  readOnly?: boolean; // If true, show in read-only mode (view only)
}

export function StepModal({ open, onClose, onSave, templates, editingStep, existingSteps = [], currentStepOrder, readOnly = false }: StepModalProps) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [triggerType, setTriggerType] = useState<'IMMEDIATE' | 'SCHEDULE'>('IMMEDIATE');
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | undefined>(undefined);
  const [delayMinutes, setDelayMinutes] = useState<string>('0.5');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [replyToStepId, setReplyToStepId] = useState<string>('');
  const [replyType, setReplyType] = useState<'OPENED' | 'CLICKED' | 'SENT' | ''>('');

  useEffect(() => {
    if (editingStep) {
      setName(editingStep.name || '');
      setTemplateId(editingStep.templateId || '');
      const stepTriggerType = editingStep.triggerType || 'IMMEDIATE';
      // Handle backward compatibility: COMPLETION should not exist anymore, but handle it gracefully
      // Cast to any to allow checking for old COMPLETION values from database
      const stepTriggerTypeAny = stepTriggerType as any;
      const normalizedTriggerType = (stepTriggerTypeAny === 'COMPLETION') ? 'IMMEDIATE' : stepTriggerType;
      setTriggerType(normalizedTriggerType as 'IMMEDIATE' | 'SCHEDULE');
      setDelayMinutes(editingStep.delayMinutes ? String(editingStep.delayMinutes) : '0.5');
      setTimezone((editingStep as any).timezone || 'UTC');
      const stepReplyToStepId = (editingStep as any).replyToStepId || '';
      setReplyToStepId(stepReplyToStepId);
      setReplyType((editingStep as any).replyType || '');
      // Parse scheduleTime if it exists (stored in UTC)
      // Convert UTC to step timezone for display using browser's Intl API (no calculations)
      if (editingStep.scheduleTime && stepTriggerType === 'SCHEDULE') {
        const stepTimezone = (editingStep as any).timezone || 'UTC';
        const utcDate = new Date(editingStep.scheduleTime);

        // Use Intl API to get date components in step timezone (browser native, no library)
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: stepTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        const parts = formatter.formatToParts(utcDate);
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1; // 0-11
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

        // Create date in local timezone with step timezone values for display
        const displayDate = new Date(year, month, day, hour, minute, second);
        setScheduledDateTime(displayDate);
      } else {
        setScheduledDateTime(undefined);
      }
    } else {
      setName('');
      setTemplateId('');
      setTriggerType('IMMEDIATE');
      setScheduledDateTime(undefined);
      setDelayMinutes('0.5');
      setTimezone('UTC');
      setReplyToStepId('');
      setReplyType('');
    }
  }, [editingStep, open]);

  // When replyToStepId is set, clear schedule time (reply steps don't use schedule)
  useEffect(() => {
    if (replyToStepId && scheduledDateTime) {
      setScheduledDateTime(undefined);
    }
  }, [replyToStepId]);

  const handleSave = () => {
    // Simple: Just send date/time components and timezone to backend
    // Backend will handle all timezone conversions using Luxon
    let scheduleTime: string | null = null;

    if (triggerType === 'SCHEDULE' && scheduledDateTime) {
      // Extract date/time components (user's local time)
      const year = scheduledDateTime.getFullYear();
      const month = scheduledDateTime.getMonth() + 1; // 1-12
      const day = scheduledDateTime.getDate();
      const hours = scheduledDateTime.getHours();
      const minutes = scheduledDateTime.getMinutes();
      const seconds = scheduledDateTime.getSeconds();

      // Send as simple date/time string: "YYYY-MM-DDTHH:mm:ss"
      // Backend will interpret this in the step's timezone
      scheduleTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const delayValue = delayMinutes ? parseFloat(delayMinutes) : undefined;

    onSave({
      ...(editingStep?.id ? { id: editingStep.id } : {}),
      name,
      templateId,
      triggerType,
      scheduleTime, // Simple date/time string (no timezone conversion)
      delayMinutes: delayValue,
      timezone: timezone || 'UTC', // Send timezone separately
      replyToStepId: replyToStepId || null,
      replyType: replyType || null,
    });
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setTemplateId('');
    setTriggerType('IMMEDIATE');
    setScheduledDateTime(undefined);
    setDelayMinutes('0.5');
    setTimezone('UTC');
    setReplyToStepId('');
    setReplyType('');
    onClose();
  };

  // Filter previous steps:
  // 1. Only show steps before current step order
  // 2. Only show completed steps (progressPercentage >= 100 or emailsCompleted >= totalExpected)
  const previousSteps = existingSteps.filter(step => {
    // Filter by step order
    const isBeforeCurrent = currentStepOrder === undefined || step.stepOrder < currentStepOrder;
    if (!isBeforeCurrent) return false;

    // Check if step is completed
    const progressPercentage = (step as any).progressPercentage ?? 0;
    const emailsCompleted = (step as any).emailsCompleted ?? step.emailsSent ?? 0;
    const totalExpected = (step as any).totalExpected ?? 0;

    // Step is completed if:
    // - progressPercentage is 100% or more, OR
    // - step has emails and all expected emails are completed (emailsCompleted >= totalExpected and totalExpected > 0)
    const isCompleted = progressPercentage >= 100 || (totalExpected > 0 && emailsCompleted >= totalExpected);

    return isCompleted;
  });

  const canSave = name.trim() && templateId && delayMinutes && parseFloat(delayMinutes) >= 0.5 &&
    (triggerType === 'IMMEDIATE' ||
      (triggerType === 'SCHEDULE' && scheduledDateTime)) &&
    (!replyToStepId || replyType); // If replyToStepId is set, replyType must be set

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? 'View Sequence'
              : editingStep
                ? 'Edit Sequence'
                : 'Add Sequence'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="step-name">Sequence Name *</Label>
              <Input
                id="step-name"
                placeholder="Enter sequence name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-template">Email Template *</Label>
              <Select value={templateId} onValueChange={setTemplateId} disabled={readOnly}>
                <SelectTrigger id="step-template" className="w-full" disabled={readOnly}>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trigger-type">Trigger Type *</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => setTriggerType(v as 'IMMEDIATE' | 'SCHEDULE')}
                disabled={readOnly}
              >
                <SelectTrigger id="trigger-type" className="w-full" disabled={readOnly}>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                  <SelectItem value="SCHEDULE">Schedule</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {triggerType === 'IMMEDIATE'
                  ? 'Starts immediately'
                  : triggerType === 'SCHEDULE'
                    ? 'Starts at scheduled time'
                    : 'Select trigger'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay-minutes">Delay (minutes) *</Label>
              <Input
                id="delay-minutes"
                type="number"
                placeholder="Enter delay"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                min="0.5"
                step="0.1"
                required
                disabled={readOnly}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-muted-foreground">
                {delayMinutes && parseFloat(delayMinutes) > 0 ? (
                  (() => {
                    const delay = parseFloat(delayMinutes);
                    const emailsPerHour = Math.round(60 / delay);
                    return `${delay} min = ${emailsPerHour} emails/hour`;
                  })()
                ) : (
                  '0.5 min = 120 emails/hour'
                )}
              </p>
            </div>
          </div>
          {triggerType === 'SCHEDULE' && (
            <div className="space-y-2">
              <Label htmlFor="step-datetime">Schedule Date & Time *</Label>
              <DateTimePicker
                date={scheduledDateTime}
                setDate={setScheduledDateTime}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Required for scheduled sequences</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="step-timezone">Timezone *</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={readOnly}>
              <SelectTrigger id="step-timezone" className="w-full" disabled={readOnly}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {CommonTimezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Timezone for day boundaries and scheduling calculations
            </p>
          </div>
          {previousSteps.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="reply-to-step">Follow up to Sequence (Optional)</Label>
              <Select
                value={replyToStepId || undefined}
                onValueChange={(value) => setReplyToStepId(value)}
                disabled={readOnly}
              >
                <SelectTrigger id="reply-to-step" className="w-full" disabled={readOnly}>
                  <SelectValue placeholder="None - Send to all contacts" />
                </SelectTrigger>
                <SelectContent>
                  {previousSteps.map((step) => (
                    <SelectItem key={step.id} value={step.id}>
                      {step.name || `Sequence ${step.stepOrder}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional: Follow up to contacts from a completed sequence. Emails thread together.
              </p>
              {replyToStepId && (
                <div className="space-y-2">
                  <Label htmlFor="reply-type">Filter Follow Up List *</Label>
                  <Select value={replyType} onValueChange={(v) => setReplyType(v as 'OPENED' | 'CLICKED' | 'SENT')} disabled={readOnly}>
                    <SelectTrigger id="reply-type" className="w-full" disabled={readOnly}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SENT">Sent (All Except Bounced)</SelectItem>
                      <SelectItem value="OPENED">Opened Only</SelectItem>
                      <SelectItem value="CLICKED">Clicked Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {replyType === 'OPENED'
                      ? 'Only who opened (excludes clicks & replies)'
                      : replyType === 'CLICKED'
                        ? 'Only who clicked (excludes replies)'
                        : replyType === 'SENT'
                          ? 'All who were sent (excludes bounced & replies)'
                          : 'Required when follow up to sequence'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {readOnly ? (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                Save Sequence
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

