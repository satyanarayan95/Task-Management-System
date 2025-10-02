import { useState, useEffect } from 'react';
import { Clock, Repeat, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';

const RecurrencePattern = ({ 
  value, 
  onChange, 
  disabled = false,
  startDate,
  duration 
}) => {
  const [pattern, setPattern] = useState({
    frequency: 'daily',
    interval: 1,
    daysOfWeek: [],
    dayOfMonth: 1,
    endDate: null,
    endOccurrences: null,
    timezone: 'Asia/Kolkata',
    ...value
  });

  const [errors, setErrors] = useState([]);

  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    validatePattern();
  }, [pattern]);

  const validatePattern = () => {
    const newErrors = [];

    // Validate frequency-specific requirements
    if (pattern.frequency === 'weekly' && pattern.daysOfWeek.length === 0) {
      newErrors.push('Please select at least one day of the week');
    }

    if (pattern.frequency === 'monthly' && !pattern.dayOfMonth) {
      newErrors.push('Please select a day of the month');
    }

    // Validate end conditions
    if (pattern.endDate && pattern.endOccurrences) {
      newErrors.push('Cannot specify both end date and end occurrences');
    }

    // Validate end date is after start date
    if (pattern.endDate && startDate) {
      const endDate = new Date(pattern.endDate);
      const start = new Date(startDate);
      if (endDate <= start) {
        newErrors.push('End date must be after start date');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const updatePattern = (updates) => {
    const newPattern = { ...pattern, ...updates };
    setPattern(newPattern);
    onChange?.(newPattern);
  };

  const toggleDayOfWeek = (dayValue) => {
    const newDays = pattern.daysOfWeek.includes(dayValue)
      ? pattern.daysOfWeek.filter(d => d !== dayValue)
      : [...pattern.daysOfWeek, dayValue];
    updatePattern({ daysOfWeek: newDays });
  };

  const getPreviewText = () => {
    if (!duration) return 'Set duration to see preview';
    
    const frequencyText = pattern.frequency;
    const intervalText = pattern.interval === 1 ? '' : `every ${pattern.interval} `;
    
    let timeText = '';
    switch (frequencyText) {
      case 'daily':
        timeText = `${intervalText}day${pattern.interval > 1 ? 's' : ''}`;
        break;
      case 'weekly':
        if (pattern.daysOfWeek.length > 0) {
          const dayNames = pattern.daysOfWeek.map(d => weekDays.find(w => w.value === d)?.label).join(', ');
          timeText = `${intervalText}week${pattern.interval > 1 ? 's' : ''} on ${dayNames}`;
        } else {
          timeText = `${intervalText}week${pattern.interval > 1 ? 's' : ''}`;
        }
        break;
      case 'monthly':
        timeText = `${intervalText}month${pattern.interval > 1 ? 's' : ''} on day ${pattern.dayOfMonth}`;
        break;
      case 'yearly':
        timeText = `${intervalText}year${pattern.interval > 1 ? 's' : ''}`;
        break;
    }

    let endText = '';
    if (pattern.endDate) {
      endText = `, until ${format(new Date(pattern.endDate), 'MMM d, yyyy')}`;
    } else if (pattern.endOccurrences) {
      endText = `, ${pattern.endOccurrences} time${pattern.endOccurrences > 1 ? 's' : ''}`;
    }

    return `Repeats ${timeText}${endText}`;
  };


  const getDueForText = () => {
    if (!duration) return 'No duration set';
    
    const totalMinutes = (duration.years || 0) * 525600 +
                        (duration.months || 0) * 43800 +
                        (duration.days || 0) * 1440 +
                        (duration.hours || 0) * 60 +
                        (duration.minutes || 0);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    } else if (totalMinutes < 1440) {
      const hours = Math.floor(totalMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (totalMinutes < 43800) {
      const days = Math.floor(totalMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (totalMinutes < 525600) {
      const months = Math.floor(totalMinutes / 43800);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(totalMinutes / 525600);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-gray-600" />
        <Label className="text-sm font-medium">Recurrence Pattern</Label>
      </div>

      {/* Frequency and Interval */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Frequency</Label>
          <Select
            value={pattern.frequency}
            onValueChange={(value) => updatePattern({ frequency: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Every</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="99"
              value={pattern.interval}
              onChange={(e) => updatePattern({ interval: parseInt(e.target.value) || 1 })}
              className="h-8 w-16 text-sm"
              disabled={disabled}
            />
            <span className="text-xs text-gray-500">
              {pattern.frequency === 'daily' && (pattern.interval === 1 ? 'day' : 'days')}
              {pattern.frequency === 'weekly' && (pattern.interval === 1 ? 'week' : 'weeks')}
              {pattern.frequency === 'monthly' && (pattern.interval === 1 ? 'month' : 'months')}
              {pattern.frequency === 'yearly' && (pattern.interval === 1 ? 'year' : 'years')}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly - Days of Week */}
      {pattern.frequency === 'weekly' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600">Days of Week</Label>
          <div className="flex flex-wrap gap-1">
            {weekDays.map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={pattern.daysOfWeek.includes(day.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDayOfWeek(day.value)}
                disabled={disabled}
                className="h-7 px-2 text-xs"
              >
                {day.label.substring(0, 3)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly - Day of Month */}
      {pattern.frequency === 'monthly' && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Day of Month</Label>
          <Select
            value={pattern.dayOfMonth?.toString()}
            onValueChange={(value) => updatePattern({ dayOfMonth: parseInt(value) })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {monthDays.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Day {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* End Conditions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Ends</Label>
          <Select
            value={pattern.endDate ? 'date' : pattern.endOccurrences ? 'count' : 'never'}
            onValueChange={(value) => {
              if (value === 'never') {
                updatePattern({ endDate: null, endOccurrences: null });
              } else if (value === 'date') {
                updatePattern({ endDate: null, endOccurrences: null });
                // Set a default end date if start date is available
                if (startDate) {
                  const defaultEndDate = new Date(startDate);
                  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1); // Default to 1 month from start
                  updatePattern({ endDate: defaultEndDate.toISOString() });
                } else {
                  // If no start date, set a default end date (30 days from now)
                  const defaultEndDate = new Date();
                  defaultEndDate.setDate(defaultEndDate.getDate() + 30);
                  updatePattern({ endDate: defaultEndDate.toISOString() });
                }
              } else if (value === 'count') {
                updatePattern({ endDate: null, endOccurrences: 10 });
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="count">After occurrences</SelectItem>
              <SelectItem value="date">On date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Timezone</Label>
          <Select
            value={pattern.timezone}
            onValueChange={(value) => updatePattern({ timezone: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
              <SelectItem value="Europe/London">London</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* End Occurrences */}
      {pattern.endOccurrences !== null && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Number of occurrences</Label>
          <Input
            type="number"
            min="1"
            max="999"
            value={pattern.endOccurrences || ''}
            onChange={(e) => updatePattern({ endOccurrences: parseInt(e.target.value) || 1 })}
            className="h-8 w-24 text-sm"
            disabled={disabled}
          />
        </div>
      )}

      {/* End Date */}
      {pattern.endDate !== null && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">End date</Label>
          <Input
            type="date"
            value={pattern.endDate ? new Date(pattern.endDate).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const endDate = e.target.value ? new Date(e.target.value) : null;
              updatePattern({ endDate });
            }}
            min={startDate ? new Date(startDate).toISOString().split('T')[0] : undefined}
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>
      )}

      {/* Integrated Preview */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Preview</span>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-blue-800">
            {getPreviewText()}
          </div>
          {duration && (
            <div className="text-xs text-blue-700">
              Due for Task: {getDueForText()}
            </div>
          )}
          {startDate && duration && (
            <div className="text-xs text-blue-700">
              First: {format(new Date(startDate), 'MMM d, yyyy HH:mm')} ({pattern.timezone})
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-red-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurrencePattern;