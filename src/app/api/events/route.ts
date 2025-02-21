import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newDate } from "@/lib/date-utils";

// List all calendar events
export async function GET() {
  try {
    console.log("Fetching events from database...");
    const events = await prisma.calendarEvent.findMany();
    console.log(`Found ${events.length} events in database`);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
// Create a new event
export async function POST(request: Request) {
  try {
    const {
      feedId,
      title,
      description,
      start,
      end,
      location,
      isRecurring,
      recurrenceRule,
      allDay,
    } = await request.json();

    if (!feedId || !title || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId },
      include: {
        account: true,
      },
    });

    if (!feed) {
      return NextResponse.json(
        { error: "Calendar feed not found" },
        { status: 404 }
      );
    }

    // Create event in database
    const event = await prisma.calendarEvent.create({
      data: {
        feedId,
        title,
        description,
        start: newDate(start),
        end: newDate(end),
        location,
        isRecurring: isRecurring || false,
        recurrenceRule,
        allDay: allDay || false,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}

// Update an event
export async function PATCH(request: Request) {
  try {
    const {
      id,
      title,
      description,
      start,
      end,
      location,
      isRecurring,
      recurrenceRule,
      allDay,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description,
        start: start ? newDate(start) : undefined,
        end: end ? newDate(end) : undefined,
        location,
        isRecurring,
        recurrenceRule,
        allDay,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Failed to update calendar event:", error);
    return NextResponse.json(
      { error: "Failed to update calendar event" },
      { status: 500 }
    );
  }
}

// Delete an event
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar event" },
      { status: 500 }
    );
  }
}
