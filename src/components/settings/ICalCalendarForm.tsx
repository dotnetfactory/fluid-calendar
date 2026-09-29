import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { logger } from "@/lib/logger";

import { useCalendarStore } from "@/store/calendar";

const LOG_SOURCE = "ICalCalendarForm";

interface ICalCalendarFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Form for subscribing to a public iCal/ICS URL as a read-only calendar feed.
 * Collects a display name, the subscription URL, and an optional color.
 */
export function ICalCalendarForm({
  onSuccess,
  onCancel,
}: ICalCalendarFormProps) {
  const addFeed = useCalendarStore((state) => state.addFeed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    color: "#3b82f6",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim() || !formData.url.trim()) {
      setErrorMessage("Please provide a name and a URL");
      return;
    }

    try {
      setIsSubmitting(true);
      await addFeed(
        formData.name.trim(),
        formData.url.trim(),
        "ICAL",
        formData.color
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error(
        "Failed to subscribe to iCal calendar",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to subscribe to iCal calendar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscribe to iCal Calendar</CardTitle>
        <CardDescription>
          Subscribe to a public iCal/ICS calendar by URL (for example a sports
          schedule or holiday calendar). The calendar is read-only and refreshes
          when you sync it.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <fieldset className="mb-4">
            <Label
              className="mb-2.5 text-[15px] leading-normal"
              htmlFor="ical-name"
            >
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ical-name"
              name="name"
              placeholder="Bundesliga Schedule"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </fieldset>

          <fieldset className="mb-4">
            <Label
              className="mb-2.5 text-[15px] leading-normal"
              htmlFor="ical-url"
            >
              Calendar URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ical-url"
              name="url"
              placeholder="https://example.com/calendar.ics"
              value={formData.url}
              onChange={handleChange}
              required
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a public iCal/ICS URL (http, https, or webcal).
            </p>
          </fieldset>

          <fieldset className="mb-4">
            <Label
              className="mb-2.5 text-[15px] leading-normal"
              htmlFor="ical-color"
            >
              Color
            </Label>
            <Input
              id="ical-color"
              name="color"
              type="color"
              value={formData.color}
              onChange={handleChange}
              className="h-10 w-16 p-1"
            />
          </fieldset>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
