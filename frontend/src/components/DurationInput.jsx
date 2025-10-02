import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

const DurationInput = ({ 
  value, 
  onChange, 
  disabled = false,
  label = "Duration",
  showPreview = true,
  required = false
}) => {
  const [duration, setDuration] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    ...value
  });

  const [errors, setErrors] = useState([]);

  // Sync internal state with prop changes
  useEffect(() => {
    setDuration({
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      ...value
    });
  }, [value]);

  useEffect(() => {
    validateDuration();
  }, [duration]);

  const validateDuration = () => {
    const newErrors = [];

    // Check if at least one unit is positive for required fields
    const total = duration.years + duration.months + duration.days + duration.hours + duration.minutes;
    if (required && total === 0) {
      newErrors.push('Duration must have at least one positive value');
    }

    // Validate ranges
    if (duration.years < 0 || duration.years > 99) {
      newErrors.push('Years must be between 0 and 99');
    }
    if (duration.months < 0 || duration.months > 11) {
      newErrors.push('Months must be between 0 and 11');
    }
    if (duration.days < 0 || duration.days > 30) {
      newErrors.push('Days must be between 0 and 30');
    }
    if (duration.hours < 0 || duration.hours > 23) {
      newErrors.push('Hours must be between 0 and 23');
    }
    if (duration.minutes < 0 || duration.minutes > 59) {
      newErrors.push('Minutes must be between 0 and 59');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const updateDuration = (field, newValue) => {
    const value = parseInt(newValue) || 0;
    const newDuration = { ...duration, [field]: value };
    setDuration(newDuration);
    onChange?.(newDuration);
  };

  const getTotalMinutes = () => {
    let total = 0;
    total += duration.years * 365 * 24 * 60;
    total += duration.months * 30 * 24 * 60;
    total += duration.days * 24 * 60;
    total += duration.hours * 60;
    total += duration.minutes;
    return total;
  };

  const getPreviewText = () => {
    const parts = [];
    
    if (duration.years > 0) parts.push(`${duration.years} year${duration.years > 1 ? 's' : ''}`);
    if (duration.months > 0) parts.push(`${duration.months} month${duration.months > 1 ? 's' : ''}`);
    if (duration.days > 0) parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
    if (duration.hours > 0) parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
    if (duration.minutes > 0) parts.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
    
    if (parts.length === 0) {
      return required ? 'Duration required' : 'No duration set';
    }
    
    return parts.join(', ');
  };

  const getCompactText = () => {
    const parts = [];
    
    if (duration.years > 0) parts.push(`${duration.years}y`);
    if (duration.months > 0) parts.push(`${duration.months}mo`);
    if (duration.days > 0) parts.push(`${duration.days}d`);
    if (duration.hours > 0) parts.push(`${duration.hours}h`);
    if (duration.minutes > 0) parts.push(`${duration.minutes}m`);
    
    if (parts.length === 0) {
      return required ? 'Required' : 'None';
    }
    
    return parts.join(' ');
  };

  const commonDurations = [
    { label: '30 minutes', value: { years: 0, months: 0, days: 0, hours: 0, minutes: 30 } },
    { label: '1 hour', value: { years: 0, months: 0, days: 0, hours: 1, minutes: 0 } },
    { label: '2 hours', value: { years: 0, months: 0, days: 0, hours: 2, minutes: 0 } },
    { label: '4 hours', value: { years: 0, months: 0, days: 0, hours: 4, minutes: 0 } },
    { label: '1 day', value: { years: 0, months: 0, days: 1, hours: 0, minutes: 0 } },
    { label: '1 week', value: { years: 0, months: 0, days: 7, hours: 0, minutes: 0 } },
    { label: '1 month', value: { years: 0, months: 1, days: 0, hours: 0, minutes: 0 } },
  ];

  const applyCommonDuration = (commonDuration) => {
    setDuration(commonDuration.value);
    onChange?.(commonDuration.value);
  };

  const clearDuration = () => {
    const clearedDuration = { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
    setDuration(clearedDuration);
    onChange?.(clearedDuration);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-600" />
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      </div>

      {/* Common Durations */}
      <div className="flex flex-wrap gap-2">
        {commonDurations.map((common, index) => (
          <Badge
            key={index}
            variant="outline"
            className="cursor-pointer hover:bg-gray-100 text-xs"
            onClick={() => applyCommonDuration(common)}
          >
            {common.label}
          </Badge>
        ))}
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-gray-100 text-red-600 text-xs"
          onClick={clearDuration}
        >
          Clear
        </Badge>
      </div>

      {/* Duration Inputs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Years</Label>
          <Input
            type="number"
            min="0"
            max="99"
            value={duration.years || ''}
            onChange={(e) => updateDuration('years', e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Months</Label>
          <Input
            type="number"
            min="0"
            max="11"
            value={duration.months || ''}
            onChange={(e) => updateDuration('months', e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Days</Label>
          <Input
            type="number"
            min="0"
            max="30"
            value={duration.days || ''}
            onChange={(e) => updateDuration('days', e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Hours</Label>
          <Input
            type="number"
            min="0"
            max="23"
            value={duration.hours || ''}
            onChange={(e) => updateDuration('hours', e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Minutes</Label>
          <Input
            type="number"
            min="0"
            max="59"
            value={duration.minutes || ''}
            onChange={(e) => updateDuration('minutes', e.target.value)}
            placeholder="0"
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Integrated Preview */}
      {showPreview && (
        <div className="bg-gray-50 rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">{getPreviewText()}</div>
              <div className="text-xs text-gray-500">
                {getCompactText()} • {getTotalMinutes()} minutes total
              </div>
            </div>
            {getTotalMinutes() > 0 && (
              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {getTotalMinutes() < 60 ? `${getTotalMinutes()} min` :
                 getTotalMinutes() < 1440 ? `${Math.floor(getTotalMinutes() / 60)}h ${getTotalMinutes() % 60}m` :
                 `${Math.floor(getTotalMinutes() / 1440)}d ${Math.floor((getTotalMinutes() % 1440) / 60)}h`}
              </div>
            )}
          </div>
        </div>
      )}

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

export default DurationInput;