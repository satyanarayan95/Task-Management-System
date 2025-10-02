import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ChevronDownIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Label } from "./label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "../../lib/utils";

export const DateTimePicker = forwardRef(function DateTimePicker({
  label,
  placeholder = "Select date and time",
  value,
  onChange,
  disabled = false,
  includeTime = true,
  className,
  required = false,
  error,
  ...props
}, ref) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : undefined);
  const [timeValue, setTimeValue] = useState(
    value ? format(new Date(value), "HH:mm") : ""
  );

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      if (includeTime) {
        setTimeValue(format(date, "HH:mm"));
      }
    } else {
      setSelectedDate(undefined);
      setTimeValue("");
    }
  }, [value, includeTime]);

  useImperativeHandle(ref, () => ({
    focus: () => {
    },
    getValue: () => {
      if (!selectedDate) return null;
      
      if (includeTime && timeValue) {
        const [hours, minutes] = timeValue.split(':');
        const dateTime = new Date(selectedDate);
        dateTime.setHours(parseInt(hours, 10));
        dateTime.setMinutes(parseInt(minutes, 10));
        dateTime.setSeconds(0);
        dateTime.setMilliseconds(0);
        return dateTime.toISOString();
      }
      
      const dateOnly = new Date(selectedDate);
      dateOnly.setHours(0, 0, 0, 0);
      return dateOnly.toISOString();
    },
    setValue: (newValue) => {
      if (newValue) {
        const date = new Date(newValue);
        setSelectedDate(date);
        if (includeTime) {
          setTimeValue(format(date, "HH:mm"));
        }
      } else {
        setSelectedDate(undefined);
        setTimeValue("");
      }
    }
  }));

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    
    if (!includeTime) {
      if (date) {
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        onChange?.(dateOnly.toISOString());
      } else {
        onChange?.(null);
      }
      setOpen(false);
    } else if (date && timeValue) {
      const [hours, minutes] = timeValue.split(':');
      const dateTime = new Date(date);
      dateTime.setHours(parseInt(hours, 10));
      dateTime.setMinutes(parseInt(minutes, 10));
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);
      onChange?.(dateTime.toISOString());
    } else if (date && !timeValue) {
      const dateTime = new Date(date);
      dateTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
      setTimeValue("09:00");
      onChange?.(dateTime.toISOString());
    }
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    
    if (selectedDate && newTime) {
      const [hours, minutes] = newTime.split(':');
      const dateTime = new Date(selectedDate);
      dateTime.setHours(parseInt(hours, 10));
      dateTime.setMinutes(parseInt(minutes, 10));
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);
      onChange?.(dateTime.toISOString());
    }
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder;
    
    if (includeTime && timeValue) {
      return `${format(selectedDate, "MMM dd, yyyy")} at ${timeValue}`;
    }
    
    return format(selectedDate, "MMM dd, yyyy");
  };

  const clearValue = () => {
    setSelectedDate(undefined);
    setTimeValue("");
    onChange?.(null);
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && (
        <Label className={cn("text-sm font-medium", error && "text-destructive")}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      
      <div className={cn(
        "flex gap-2",
        includeTime ? "flex-col sm:flex-row" : "flex-col"
      )}>
        <div className="flex-1 min-w-0">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal min-w-0",
                  !selectedDate && "text-muted-foreground",
                  error && "border-destructive focus:ring-destructive",
                  disabled && "cursor-not-allowed opacity-50"
                )}
                disabled={disabled}
                {...props}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date"}
                </span>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearValue();
                    }}
                    className="ml-auto h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0"
                  >
                    ×
                  </button>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={disabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {includeTime && (
          <div className="flex-1 sm:flex-none sm:w-24 min-w-0">
            <div className="relative">
              <ClockIcon className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                disabled={disabled || !selectedDate}
                placeholder="--:--"
                className={cn(
                  "pl-7 text-xs w-auto",
                  error && "border-destructive focus:ring-destructive",
                  (!selectedDate || disabled) && "cursor-not-allowed opacity-50"
                )}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
});

export function DatePicker({ label, ...props }) {
  return <DateTimePicker label={label} includeTime={false} {...props} />;
}
