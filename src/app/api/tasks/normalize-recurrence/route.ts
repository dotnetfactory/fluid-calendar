import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";
/**
 * This endpoint normalizes recurrence rules in all tasks,
 * converting non-standard formats like ABSOLUTEMONTHLY to standard MONTHLY
 */
export async function POST() {
  try {
    // Get all recurring tasks with recurrence rules
    const recurringTasks = await prisma.task.findMany({
      where: {
        isRecurring: true,
        recurrenceRule: {
          not: null,
        },
      },
    });

    console.log(`Found ${recurringTasks.length} recurring tasks to normalize`);

    // Keep track of updated tasks
    const updatedTasks = [];
    const failedTasks = [];

    // Process each task and update if needed
    for (const task of recurringTasks) {
      if (!task.recurrenceRule) continue;

      try {
        let needsUpdate = false;

        const standardizedRule = task.recurrenceRule
        ? normalizeRecurrenceRule(task.recurrenceRule)
        : undefined;
        if(standardizedRule !== task.recurrenceRule) {
          needsUpdate = true;
        }
        // Only update if changes were made
        if (needsUpdate && standardizedRule) {
          // Validate the standardized rule
          RRule.fromString(standardizedRule);

          // Update the task with the standardized rule
          await prisma.task.update({
            where: { id: task.id },
            data: { recurrenceRule: standardizedRule },
          });

          updatedTasks.push({
            id: task.id,
            title: task.title,
            oldRule: task.recurrenceRule,
            newRule: standardizedRule,
          });
        }
      } catch (error) {
        console.error(
          `Error normalizing task ${task.id} (${task.title}):`,
          error
        );
        failedTasks.push({
          id: task.id,
          title: task.title,
          rule: task.recurrenceRule,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalTasks: recurringTasks.length,
      updatedCount: updatedTasks.length,
      failedCount: failedTasks.length,
      updatedTasks,
      failedTasks,
    });
  } catch (error) {
    console.error("Error normalizing recurrence rules:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
