"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  DAY_SHORT,
  NewScheduleTimeBlock,
  Schedule,
} from "@/types/schedule";

import { useScheduleStore } from "@/store/schedule";
import { useSettingsStore } from "@/store/settings";

const GRID_START_HOUR = 5; // Grid starts at 5 AM
const GRID_END_HOUR = 23; // Grid ends at 11 PM
const GRID_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const ROW_HEIGHT = 20; // pixels per hour

function DragGrid({
  blocks,
  onAddBlock,
  onRemoveBlock,
  onCopyDay,
  scheduleColor,
}: {
  blocks: NewScheduleTimeBlock[];
  onAddBlock: (dayOfWeek: number, startHour: number, endHour: number) => void;
  onRemoveBlock: (dayOfWeek: number, blockIndex: number) => void;
  onCopyDay: (sourceDayIndex: number, targetDays: number[]) => void;
  scheduleColor: string;
}) {
  const [dragState, setDragState] = useState<{
    day: number;
    startHour: number;
    currentHour: number;
  } | null>(null);
  const [copyingDay, setCopyingDay] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getHourFromY = (y: number, rect: DOMRect) => {
    const relY = y - rect.top;
    const hour = GRID_START_HOUR + (relY / rect.height) * GRID_HOURS;
    return Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR, Math.round(hour)));
  };

  const handleMouseDown = (day: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = getHourFromY(e.clientY, rect);

    // Check if clicking on an existing block
    const dayBlocks = blocks.filter((b) => b.dayOfWeek === day);
    const clickedBlockIdx = dayBlocks.findIndex(
      (b) => hour >= b.startHour && hour < b.endHour
    );
    if (clickedBlockIdx >= 0) {
      onRemoveBlock(day, clickedBlockIdx);
      return;
    }

    setDragState({ day, startHour: hour, currentHour: hour });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const dayCol = e.currentTarget.querySelector(
      `[data-day="${dragState.day}"]`
    ) as HTMLElement;
    if (!dayCol) return;
    const rect = dayCol.getBoundingClientRect();
    const hour = getHourFromY(e.clientY, rect);
    setDragState((prev) => (prev ? { ...prev, currentHour: hour } : null));
  };

  const handleMouseUp = () => {
    if (!dragState) return;
    const start = Math.min(dragState.startHour, dragState.currentHour);
    const end = Math.max(dragState.startHour, dragState.currentHour);
    if (end > start) {
      onAddBlock(dragState.day, start, end);
    }
    setDragState(null);
  };

  const blocksForDay = (day: number) =>
    blocks.filter((b) => b.dayOfWeek === day);

  return (
    <div
      ref={gridRef}
      className="select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setDragState(null)}
    >
      {/* Day headers */}
      <div className="mb-1 grid grid-cols-[40px_repeat(7,1fr)] gap-px">
        <div />
        {DAY_SHORT.map((day, i) => (
          <div key={i} className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold">{day}</span>
            <button
              onClick={() => setCopyingDay(copyingDay === i ? null : i)}
              className="text-[10px] text-primary hover:underline"
            >
              Copy
            </button>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative grid grid-cols-[40px_repeat(7,1fr)] gap-px rounded border bg-border">
        {/* Copy overlay */}
        {copyingDay !== null && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-8">
            <div className="rounded-lg border bg-background shadow-xl">
              <CopyDayModal
                sourceDayIndex={copyingDay}
                onCopy={(targets) => onCopyDay(copyingDay, targets)}
                onClose={() => setCopyingDay(null)}
              />
            </div>
          </div>
        )}
        {/* Hour labels */}
        <div className="flex flex-col bg-background">
          {Array.from({ length: GRID_HOURS }, (_, i) => (
            <div
              key={i}
              className="flex items-start justify-end border-b border-border/50 pr-1 text-[10px] text-muted-foreground"
              style={{ height: ROW_HEIGHT }}
            >
              {(GRID_START_HOUR + i).toString().padStart(2, "0")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const dayBlockList = blocksForDay(day);

          return (
            <div
              key={day}
              data-day={day}
              className="relative cursor-crosshair bg-background"
              style={{ height: GRID_HOURS * ROW_HEIGHT }}
              onMouseDown={(e) => handleMouseDown(day, e)}
            >
              {/* Hour grid lines */}
              {Array.from({ length: GRID_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-b border-border/30"
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Existing blocks */}
              {dayBlockList.map((block, idx) => {
                // Clamp to visible grid area
                const visStart = Math.max(block.startHour + (block.startMinute || 0) / 60, GRID_START_HOUR);
                const visEnd = Math.min(block.endHour + (block.endMinute || 0) / 60, GRID_END_HOUR);
                if (visEnd <= visStart) return null;

                const top = (visStart - GRID_START_HOUR) * ROW_HEIGHT;
                const height = (visEnd - visStart) * ROW_HEIGHT;

                return (
                  <div
                    key={idx}
                    className="absolute inset-x-0.5 rounded-sm border border-white/20 text-[9px] font-medium text-white"
                    style={{
                      top,
                      height: Math.max(height, 4),
                      backgroundColor: scheduleColor,
                      opacity: 0.85,
                    }}
                    title={`${block.startHour}:00 - ${block.endHour}:00 (click to remove)`}
                  >
                    <span className="px-0.5">
                      {height > 15
                        ? `${block.startHour}:00-${block.endHour}:00`
                        : ""}
                    </span>
                  </div>
                );
              })}

              {/* Drag preview */}
              {dragState && dragState.day === day && (
                <div
                  className="absolute inset-x-0.5 rounded-sm border-2 border-dashed border-primary/50 bg-primary/20"
                  style={{
                    top:
                      Math.min(dragState.startHour, dragState.currentHour) *
                        ROW_HEIGHT -
                      GRID_START_HOUR * ROW_HEIGHT,
                    height:
                      Math.abs(dragState.currentHour - dragState.startHour) *
                      ROW_HEIGHT,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-1 text-[10px] text-muted-foreground">
        Drag to add time blocks. Click a block to remove it.
      </p>
    </div>
  );
}

function CopyDayModal({
  sourceDayIndex,
  onCopy,
  onClose,
}: {
  sourceDayIndex: number;
  onCopy: (targetDays: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (day: number) => {
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="rounded-md border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium">
        Copy {DAY_SHORT[sourceDayIndex]} times to...
      </p>
      <div className="space-y-1">
        {DAY_SHORT.map((day, i) => (
          <label
            key={i}
            className={`flex items-center gap-2 text-sm ${i === sourceDayIndex ? "text-muted-foreground" : ""}`}
          >
            <input
              type="checkbox"
              disabled={i === sourceDayIndex}
              checked={selected.includes(i)}
              onChange={() => toggle(i)}
              className="rounded"
            />
            {day}
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            onCopy(selected);
            onClose();
          }}
          disabled={selected.length === 0}
        >
          Apply
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ScheduleEditor({
  schedule,
  onSave,
  onDelete,
  onClose,
}: {
  schedule: Schedule | null;
  onSave: (
    data: { name: string; timezone: string; color: string; bufferMinutes: number },
    blocks: NewScheduleTimeBlock[]
  ) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(schedule?.name || "");
  const [timezone, setTimezone] = useState(
    schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [color, setColor] = useState(schedule?.color || "#3b82f6");
  const [bufferMinutes, setBufferMinutes] = useState(
    schedule?.bufferMinutes ?? 15
  );
  const [blocks, setBlocks] = useState<NewScheduleTimeBlock[]>(
    schedule?.timeBlocks.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startHour: b.startHour,
      startMinute: b.startMinute,
      endHour: b.endHour,
      endMinute: b.endMinute,
    })) || []
  );
  const [saving, setSaving] = useState(false);

  const addBlock = (dayOfWeek: number, startHour: number, endHour: number) => {
    setBlocks((prev) => [
      ...prev,
      { dayOfWeek, startHour, startMinute: 0, endHour, endMinute: 0 },
    ]);
  };

  const removeBlock = (dayOfWeek: number, index: number) => {
    const dayBlocks = blocks.filter((b) => b.dayOfWeek === dayOfWeek);
    const blockToRemove = dayBlocks[index];
    setBlocks((prev) =>
      prev.filter(
        (b) =>
          !(
            b.dayOfWeek === blockToRemove.dayOfWeek &&
            b.startHour === blockToRemove.startHour &&
            b.endHour === blockToRemove.endHour
          )
      )
    );
  };

  const copyDay = (sourceDayIndex: number, targetDays: number[]) => {
    const sourceBlocks = blocks.filter((b) => b.dayOfWeek === sourceDayIndex);
    setBlocks((prev) => {
      const filtered = prev.filter((b) => !targetDays.includes(b.dayOfWeek));
      const copies = targetDays.flatMap((targetDay) =>
        sourceBlocks.map((b) => ({ ...b, dayOfWeek: targetDay }))
      );
      return [...filtered, ...copies];
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Schedule name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), timezone, color, bufferMinutes }, blocks);
      toast.success(schedule ? "Schedule updated" : "Schedule created");
      onClose();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{schedule ? "Edit Schedule" : "New Schedule"}</CardTitle>
        <CardDescription>
          Define when tasks in this schedule can be placed on your calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sched-name">Schedule Name</Label>
            <Input
              id="sched-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={schedule?.isSystem}
              placeholder="e.g. Military, Winery"
            />
          </div>
          <div>
            <Label htmlFor="sched-color">Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sched-tz">Timezone</Label>
            <select
              id="sched-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              {Intl.supportedValuesOf("timeZone").map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Buffer: {bufferMinutes} min</Label>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span><span>15</span><span>30</span><span>45</span><span>60</span>
            </div>
          </div>
        </div>

        {/* Weekly time block grid - drag to select */}
        <div>
          <Label>Weekly Hours</Label>
          <div className="mt-2">
            <DragGrid
              blocks={blocks}
              onAddBlock={addBlock}
              onRemoveBlock={removeBlock}
              onCopyDay={copyDay}
              scheduleColor={color}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {schedule ? "Save Changes" : "Create Schedule"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {schedule && !schedule.isSystem && onDelete && (
            <Button
              variant="destructive"
              className="ml-auto"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScheduleSettings() {
  const { schedules, loading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } =
    useScheduleStore();
  const { autoSchedule, updateAutoScheduleSettings } = useSettingsStore();
  const [editing, setEditing] = useState<Schedule | null | "new">(null);

  const load = useCallback(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (
    data: { name: string; timezone: string; color: string; bufferMinutes: number },
    blocks: NewScheduleTimeBlock[]
  ) => {
    if (editing === "new") {
      await createSchedule({ ...data, timeBlocks: blocks });
    } else if (editing) {
      await updateSchedule(editing.id, { ...data, timeBlocks: blocks });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete schedule "${name}"? All tasks and projects using it will fall back to the 24/7 schedule.`)) {
      return;
    }
    try {
      await deleteSchedule(id);
      setEditing(null);
      toast.success("Schedule deleted");
    } catch (err) {
      toast.error(String(err));
    }
  };

  if (editing) {
    return (
      <ScheduleEditor
        schedule={editing === "new" ? null : editing}
        onSave={handleSave}
        onDelete={
          editing !== "new" && !editing.isSystem
            ? () => handleDelete(editing.id, editing.name)
            : undefined
        }
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Auto-Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Schedule Settings</CardTitle>
          <CardDescription>
            Global preferences that apply across all schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Group by Project</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, tasks from the same project are scheduled closer together.
              </p>
            </div>
            <Switch
              checked={autoSchedule?.groupByProject ?? false}
              onCheckedChange={(checked) =>
                updateAutoScheduleSettings({ groupByProject: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schedules</CardTitle>
              <CardDescription>
                Define when different types of tasks can be scheduled.
                Assign projects and tasks to schedules to control their available hours.
              </CardDescription>
            </div>
            <Button onClick={() => setEditing("new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No schedules found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => {
                const blocksByDay = DAY_SHORT.map((_, i) =>
                  schedule.timeBlocks.filter((b) => b.dayOfWeek === i)
                );
                const activeDays = blocksByDay
                  .map((blocks, i) => (blocks.length > 0 ? DAY_SHORT[i] : null))
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={schedule.id}
                    className="flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors hover:bg-muted"
                    onClick={() => setEditing(schedule)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: schedule.color || "#6b7280" }}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {schedule.name}
                          {schedule.isSystem && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (System)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activeDays || "No days configured"} · {schedule.bufferMinutes}min buffer
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
