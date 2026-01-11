/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Simple CSV export utility
 */

/**
 * Export array of objects to CSV format
 */
export const exportToCSV = (data: any[], moduleName: string): void => {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  // Get headers from the first object keys
  const headers = Object.keys(data[0]);

  // Convert headers to readable format (capitalize and add spaces)
  const formattedHeaders = headers.map((header) =>
    header
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  );

  // Convert data to CSV format
  const csvData = data.map((item) => {
    return headers
      .map((header) => {
        const value = item[header] || "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  // Combine headers and data
  const csvContent = [formattedHeaders.join(","), ...csvData].join("\n");

  // Generate filename with timestamp (only if not already present)
  // Check if moduleName already contains a timestamp pattern (YYYY-MM-DD or similar)
  const hasTimestamp = /\d{4}-\d{2}-\d{2}/.test(moduleName);
  const filename = hasTimestamp 
    ? `${moduleName}.csv` 
    : `${moduleName}_export_${new Date().toISOString().split("T")[0]}.csv`;

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export array of objects to CSV format with audit logging
 * @param data - Array of objects to export
 * @param moduleName - Name of the module being exported (e.g., "organizations", "contacts")
 * @param auditConfig - Configuration for audit logging
 */
export const exportToCSVWithAudit = async (
  data: any[],
  moduleName: string,
  auditConfig: {
    module: string; // Module name for audit log (e.g., "ORGANIZATIONS", "CONTACTS")
    organizationId?: string;
    userId?: string;
    recordIds?: string[]; // Optional: IDs of records being exported
    description?: string; // Optional: Custom description
  }
): Promise<void> => {
  try {
    // Perform the export
    exportToCSV(data, moduleName);

    // Log the export action in audit log
    try {
      const { auditLogService } = await import("@/api/auditService");
      const { AuditAction } = await import("@/api/auditTypes");

      await auditLogService.createAuditLog({
        organizationId: auditConfig.organizationId,
        performedByUserId: auditConfig.userId,
        module: auditConfig.module,
        action: AuditAction.EXPORT,
        recordId: auditConfig.recordIds?.join(",") || undefined,
        description:
          auditConfig.description ||
          `Exported ${data.length} ${moduleName} to CSV`,
        details: {
          recordCount: data.length,
          moduleName: moduleName,
          recordIds: auditConfig.recordIds || [],
          exportType: "CSV",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditError) {
      // Log audit error but don't fail the export
      console.warn("Failed to log export action to audit log:", auditError);
    }
  } catch (error) {
    // Re-throw export errors
    throw error;
  }
};
