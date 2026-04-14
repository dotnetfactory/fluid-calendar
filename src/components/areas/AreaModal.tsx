"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAreaStore } from "@/store/area";
import { useScheduleStore } from "@/store/schedule";

import { Area } from "@/types/area";

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  area?: Area;
}

export function AreaModal({ isOpen, onClose, area }: AreaModalProps) {
  const { createArea, updateArea, deleteArea } = useAreaStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#E5E7EB");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
      if (area) {
        setName(area.name);
        setIcon(area.icon || "");
        setColor(area.color || "#E5E7EB");
        setScheduleId(area.scheduleId);
      } else {
        setName("");
        setIcon("");
        setColor("#E5E7EB");
        setScheduleId(null);
      }
    }
  }, [area, isOpen, fetchSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (area) {
        await updateArea(area.id, {
          name: name.trim(),
          icon: icon || undefined,
          color: color === "#E5E7EB" ? undefined : color,
          scheduleId: scheduleId || undefined,
        });
      } else {
        await createArea({
          name: name.trim(),
          icon: icon || undefined,
          color: color === "#E5E7EB" ? undefined : color,
          scheduleId: scheduleId || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving area:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!area) return;
    if (!confirm(`Delete area "${area.name}"? Projects will become unassigned.`)) return;
    setIsSubmitting(true);
    try {
      await deleteArea(area.id);
      onClose();
    } catch (error) {
      console.error("Error deleting area:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        {isSubmitting && <LoadingOverlay />}
        <DialogHeader>
          <DialogTitle>{area ? "Edit Area" : "Create Area"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🪖"
                className="text-center text-lg"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Military"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 p-1"
                />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="schedule">Schedule</Label>
              <Select
                value={scheduleId || "default"}
                onValueChange={(v) => setScheduleId(v === "default" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use default (24/7)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use default (24/7)</SelectItem>
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {area && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete Area
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
