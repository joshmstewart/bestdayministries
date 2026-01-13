import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventRecurrenceFormProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  recurrenceType: string;
  onRecurrenceTypeChange: (value: string) => void;
  recurrenceInterval: number;
  onRecurrenceIntervalChange: (value: number) => void;
  recurrenceEndDate: Date | undefined;
  onRecurrenceEndDateChange: (value: Date | undefined) => void;
  additionalDates: Date[];
  onAdditionalDatesChange: (dates: Date[]) => void;
  eventTime: string;
}

export function EventRecurrenceForm({
  isRecurring,
  onIsRecurringChange,
  recurrenceType,
  onRecurrenceTypeChange,
  recurrenceInterval,
  onRecurrenceIntervalChange,
  recurrenceEndDate,
  onRecurrenceEndDateChange,
  additionalDates,
  onAdditionalDatesChange,
  eventTime,
}: EventRecurrenceFormProps) {
  const [showAdditionalDatePicker, setShowAdditionalDatePicker] = useState(false);

  const addAdditionalDate = (date: Date | undefined) => {
    if (!date) return;
    
    // Apply the event time to the date
    const [hours, minutes] = eventTime.split(":");
    const dateWithTime = new Date(date);
    dateWithTime.setHours(parseInt(hours), parseInt(minutes));
    
    // Check if date already exists
    const exists = additionalDates.some(
      d => d.toDateString() === dateWithTime.toDateString()
    );
    
    if (!exists) {
      onAdditionalDatesChange([...additionalDates, dateWithTime]);
    }
    setShowAdditionalDatePicker(false);
  };

  const removeAdditionalDate = (index: number) => {
    const updated = additionalDates.filter((_, i) => i !== index);
    onAdditionalDatesChange(updated);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Event Recurrence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recurrence Toggle */}
        <div className="flex items-center gap-3">
          <Label htmlFor="recurring-toggle">Recurring Event</Label>
          <input
            id="recurring-toggle"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => onIsRecurringChange(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
        </div>

        {isRecurring && (
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            {/* Recurrence Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Repeat Every</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => onRecurrenceIntervalChange(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Select value={recurrenceType} onValueChange={onRecurrenceTypeChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Day(s)</SelectItem>
                      <SelectItem value="weekly">Week(s)</SelectItem>
                      <SelectItem value="monthly">Month(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !recurrenceEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "No end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={onRecurrenceEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Additional Manual Dates */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <Label>Additional Dates</Label>
            <Popover open={showAdditionalDatePicker} onOpenChange={setShowAdditionalDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={addAdditionalDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {additionalDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {additionalDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
                  >
                    <span>{format(date, "MMM d, yyyy")}</span>
                    <button
                      type="button"
                      onClick={() => removeAdditionalDate(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
