"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Activity,
  FileText,
  Database,
} from "lucide-react";
import type { AuditLog } from "@/api/auditTypes";
import {
  AuditActionLabels,
  AuditActionColors,
} from "@/api/auditTypes";

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLog: AuditLog;
}

export default function AuditLogModal({
  isOpen,
  onClose,
  auditLog,
}: AuditLogModalProps) {

  const formatJsonValue = (value: any) => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this audit log entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Performed By
              </label>
              <div className="p-3 border rounded-md bg-muted/50">
                <div className="font-medium">
                  {auditLog.performedByUser?.name || auditLog.performedByUser?.email || "System"}
                </div>
                {auditLog.performedByUser?.email && (
                  <div className="text-sm text-muted-foreground">
                    {auditLog.performedByUser.email}
                  </div>
                )}
                {auditLog.performedByUserId && (
                  <div className="text-xs text-muted-foreground">
                    ID: {auditLog.performedByUserId}
                  </div>
                )}
                {auditLog.performedByUser?.role && (
                  <div className="text-xs text-muted-foreground">
                    Role: {auditLog.performedByUser.role}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Action & Module
              </label>
              <div className="p-3 border rounded-md bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  {auditLog.action ? (
                    <Badge className={AuditActionColors[auditLog.action]}>
                      {AuditActionLabels[auditLog.action]}
                    </Badge>
                  ) : (
                    <Badge variant="outline">N/A</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">on</span>
                  {auditLog.module ? (
                    <Badge variant="outline">{auditLog.module}</Badge>
                  ) : (
                    <Badge variant="outline">N/A</Badge>
                  )}
                </div>
                {auditLog.recordId && (
                  <div className="text-sm text-muted-foreground">
                    Record ID: {auditLog.recordId}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Organization ID and Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                Organization ID
              </label>
              <div className="p-3 border rounded-md bg-muted/50">
                {auditLog.organizationId || "N/A"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </label>
              <div className="p-3 border rounded-md bg-muted/50 min-h-[60px]">
                {auditLog.description || "No description provided"}
              </div>
            </div>
          </div>

          {/* Event Details */}
          {auditLog.details && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Event Details
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Details
                </label>
                <div className="p-3 border rounded-md bg-muted/50 min-h-[120px] max-h-60 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {formatJsonValue(auditLog.details)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
