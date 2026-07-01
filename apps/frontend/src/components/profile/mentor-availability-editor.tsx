import { useState } from "react";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WeeklyAvailabilityBlock } from "@/lib/consult-api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_BLOCK: WeeklyAvailabilityBlock = {
  dayOfWeek: 1,
  startTime: "10:00",
  endTime: "18:00",
};

type Props = {
  value: WeeklyAvailabilityBlock[];
  onChange: (blocks: WeeklyAvailabilityBlock[]) => void;
  sessionDurationMinutes?: number;
};

export function MentorAvailabilityEditor({ value, onChange, sessionDurationMinutes }: Props) {
  const blocks = value;
  const hasBlocks = blocks.length > 0;

  const update = (index: number, patch: Partial<WeeklyAvailabilityBlock>) => {
    const next = blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange(next);
  };

  const add = () => onChange([...blocks, { ...DEFAULT_BLOCK }]);
  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-card p-4">
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Weekly availability
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Students only see bookable times you add here. Each slot is{" "}
          {sessionDurationMinutes ?? 30} minutes. Booked slots disappear automatically.
        </p>
      </div>

      {!hasBlocks && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            You are not visible in the mentor list until you add at least one day and time range.
          </p>
          <Button type="button" variant="default" size="sm" onClick={add}>
            <Plus className="h-4 w-4 mr-1" /> Add my hours
          </Button>
        </div>
      )}

      {blocks.map((block, index) => (
        <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end relative">
          <div className="space-y-1">
            <Label className="text-xs">Day</Label>
            <Select
              value={String(block.dayOfWeek)}
              onValueChange={(v) => update(index, { dayOfWeek: Number(v) })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_LABELS.map((label, dow) => (
                  <SelectItem key={dow} value={String(dow)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="time"
              value={block.startTime}
              onChange={(e) => update(index, { startTime: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="time"
              value={block.endTime}
              onChange={(e) => update(index, { endTime: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {hasBlocks && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1" /> Add another day
        </Button>
      )}
    </div>
  );
}
