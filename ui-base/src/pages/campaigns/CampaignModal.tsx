import { useEffect, useState } from 'react';
import { CampaignsApi } from '../../api/campaigns';
import type { Campaign } from '../../api/campaigns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAppStore } from '@/stores/appStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { emailTemplateService } from '@/api/emailTemplateService';
import { contactListService } from '@/api/contactListService';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
  organizationId: string;
  campaignId?: string;
};

export function CampaignModal({ open, onClose, onSaved, organizationId, campaignId }: Props) {
  const isEdit = !!campaignId;
  const { user } = useAppStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'IMMEDIATE' | 'SCHEDULING'>('IMMEDIATE');
  const [scheduledAt, setScheduledAt] = useState<string | ''>('');
  const [scheduledTime, setScheduledTime] = useState<string | ''>('');
  const [contactListId, setContactListId] = useState('');
  const [initialTemplateId, setInitialTemplateId] = useState('');
  const [templateOptions, setTemplateOptions] = useState<{id: string; name: string;}[]>([]);
  const [contactListOptions, setContactListOptions] = useState<{id: string; name: string;}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && isEdit && campaignId) {
      CampaignsApi.get(campaignId).then((c) => {
        setName(c.name || '');
        setType(c.type as any);
        setScheduledAt((c as any).scheduledAt || '');
        setScheduledTime((c as any).scheduledTime || '');
        setContactListId((c as any).contactListId || '');
      });
    } else if (open && !isEdit) {
      setName('');
      setType('IMMEDIATE');
      setScheduledAt('');
      setScheduledTime('');
      setContactListId('');
      setInitialTemplateId('');
    }
  }, [open, isEdit, campaignId]);

  // Load options (templates and contact lists)
  useEffect(() => {
    if (!open) return;
    const orgId = organizationId || user?.organizationId;
    if (!orgId) return;
    (async () => {
      try {
        const [tplRes, clRes] = await Promise.all([
          emailTemplateService.getTemplates({ organizationId: orgId, page: 1, limit: 50 }),
          contactListService.getContactLists({ organizationId: orgId, page: 1, limit: 50 }),
        ]);
        const tOpts = (tplRes?.data ?? []).map((t: any) => ({ id: t.id, name: t.name }));
        const cOpts = (clRes?.data?.data ?? []).map((l: any) => ({ id: l.id, name: l.name }));
        setTemplateOptions(tOpts);
        setContactListOptions(cOpts);
      } catch (e) {
        setTemplateOptions([]);
        setContactListOptions([]);
      }
    })();
  }, [open, organizationId, user?.organizationId]);

  const effectiveOrgId = organizationId || user?.organizationId || '';
  const canSave = name && effectiveOrgId && (type === 'IMMEDIATE' || scheduledAt || scheduledTime);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEdit && campaignId) {
        const updated = await CampaignsApi.update(campaignId, {
          name,
          type,
          scheduledAt: scheduledAt || null,
          scheduledTime: scheduledTime || null,
          contactListId: contactListId || null,
        } as any);
        onSaved(updated);
        toast.success('Campaign updated successfully');
      } else {
        const created = await CampaignsApi.create({
          organizationId: effectiveOrgId,
          name,
          type,
          scheduledAt: scheduledAt || null,
          scheduledTime: scheduledTime || null,
          contactListId: contactListId || null,
          initialStepTemplateId: initialTemplateId || undefined,
        } as any);
        onSaved(created);
        toast.success('Campaign created successfully');
      }
      onClose();
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

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
        </DialogHeader>
        <div className="py-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IMMEDIATE">IMMEDIATE</SelectItem>
                <SelectItem value="SCHEDULING">SCHEDULING</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'SCHEDULING' && (
            <>
              <div className="space-y-2">
                <Label>Schedule Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {scheduledAt ? format(new Date(scheduledAt), 'PPP p') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledAt ? new Date(scheduledAt) : undefined}
                      onSelect={(d: Date | undefined) => setScheduledAt(d ? d.toISOString() : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Schedule Time</Label>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Contact List</Label>
            <Select value={contactListId} onValueChange={setContactListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact list" />
              </SelectTrigger>
              <SelectContent>
                {contactListOptions.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label>Initial Step Template</Label>
              <Select value={initialTemplateId} onValueChange={setInitialTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave || saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


