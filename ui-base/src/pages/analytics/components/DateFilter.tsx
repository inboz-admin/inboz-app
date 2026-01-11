"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange as ReactDayPickerDateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DateRange = "7d" | "30d" | "90d" | "all" | "custom" | null;

interface DateFilterProps {
  onDateRangeChange: (startDate?: string, endDate?: string) => void;
}

export function DateFilter({ onDateRangeChange }: DateFilterProps) {
  // Load saved date range from sessionStorage or default to "7d"
  const [dateRange, setDateRange] = React.useState<DateRange>(() => {
    const saved = sessionStorage.getItem('analytics_dateRangeType');
    return (saved as DateRange) || "7d";
  });
  
  const [customDateRange, setCustomDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(() => {
    // Load custom date range from sessionStorage if available
    const savedCustomFrom = sessionStorage.getItem('analytics_customDateFrom');
    const savedCustomTo = sessionStorage.getItem('analytics_customDateTo');
    if (savedCustomFrom && savedCustomTo) {
      return {
        from: new Date(savedCustomFrom),
        to: new Date(savedCustomTo),
      };
    }
    return {
      from: undefined,
      to: undefined,
    };
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    // Skip on initial mount to prevent duplicate API calls
    // The parent component (AnalyticsPage) already initializes with default dates
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (dateRange === "custom") {
      // Don't trigger change until both dates are set
      if (customDateRange.from && customDateRange.to) {
        const startDateStr = format(customDateRange.from, "yyyy-MM-dd");
        const endDate = new Date(customDateRange.to);
        endDate.setHours(23, 59, 59, 999);
        const endDateStr = format(endDate, "yyyy-MM-dd");
        onDateRangeChange(startDateStr, endDateStr);
      }
    } else if (dateRange) {
      if (dateRange === "all") {
        // All time - no date filter
        onDateRangeChange(undefined, undefined);
      } else {
        const endDate = new Date();
        const startDate = new Date();
        
        if (dateRange === "7d") {
          startDate.setDate(startDate.getDate() - 7);
        } else if (dateRange === "30d") {
          startDate.setDate(startDate.getDate() - 30);
        } else if (dateRange === "90d") {
          startDate.setDate(startDate.getDate() - 90);
        }

        // Set end date to end of today
        endDate.setHours(23, 59, 59, 999);
        
        onDateRangeChange(
          startDate.toISOString().split("T")[0],
          endDate.toISOString().split("T")[0]
        );
      }
    }
  }, [dateRange, customDateRange, onDateRangeChange]);

  const handleDateRangeChange = (value: string) => {
    if (value === "") {
      setDateRange(null);
      setCustomDateRange({ from: undefined, to: undefined });
      onDateRangeChange(undefined, undefined);
      // Clear from sessionStorage
      sessionStorage.removeItem('analytics_dateRangeType');
      sessionStorage.removeItem('analytics_customDateFrom');
      sessionStorage.removeItem('analytics_customDateTo');
    } else {
      setDateRange(value as DateRange);
      // Save to sessionStorage
      sessionStorage.setItem('analytics_dateRangeType', value);
      
      if (value !== "custom") {
        setCustomDateRange({ from: undefined, to: undefined });
        // Clear custom date range from sessionStorage
        sessionStorage.removeItem('analytics_customDateFrom');
        sessionStorage.removeItem('analytics_customDateTo');
      }
    }
  };

  const handleCalendarSelect = (range: ReactDayPickerDateRange | undefined) => {
    if (range) {
      setCustomDateRange({
        from: range.from,
        to: range.to,
      });
      
      // Save custom date range to sessionStorage
      if (range.from) {
        sessionStorage.setItem('analytics_customDateFrom', range.from.toISOString());
      }
      if (range.to) {
        sessionStorage.setItem('analytics_customDateTo', range.to.toISOString());
      }
      
      // Close calendar when both dates are selected
      if (range.from && range.to) {
        setIsCalendarOpen(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Select value={dateRange || ""} onValueChange={handleDateRangeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 3 months</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {dateRange === "custom" && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[300px] justify-start text-left font-normal",
                !customDateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customDateRange.from ? (
                customDateRange.to ? (
                  <>
                    {format(customDateRange.from, "MM/dd/yyyy")} -{" "}
                    {format(customDateRange.to, "MM/dd/yyyy")}
                  </>
                ) : (
                  format(customDateRange.from, "MM/dd/yyyy")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={customDateRange.from}
              selected={customDateRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

