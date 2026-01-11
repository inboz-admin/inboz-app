import { FileX, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoDataStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
  icon?: React.ReactNode;
}

export function NoDataState({
  title = "No Data Available",
  description = "There is no data to display at the moment.",
  actionLabel = "Add New",
  onAction,
  showAction = true,
  icon,
}: NoDataStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
      <div className="mb-4">
        {icon || <FileX className="h-12 w-12 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {showAction && onAction && (
        <Button onClick={onAction} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
