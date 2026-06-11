/**
 * @jest-environment node
 */
import { pushTaskBlock } from "../lib/task-block-push";
import * as googleCalendar from "../lib/google-calendar";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

// Mock dependencies
jest.mock("../lib/google-calendar");
jest.mock("../lib/prisma");
jest.mock("../lib/logger");

describe("pushTaskBlock", () => {
  const mockUserId = "user-123";
  const mockTaskId = "task-456";
  const mockFeedId = "feed-789";
  const mockEventId = "event-999";
  const mockAccountId = "account-111";
  const mockCalendarId = "calendar-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when task has scheduled times and push is enabled", () => {
    it("should create a calendar event when blockEventId is null", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: "Test Task",
        description: "Test Description",
        status: "todo",
        scheduledStart: new Date("2025-06-15T10:00:00Z"),
        scheduledEnd: new Date("2025-06-15T11:00:00Z"),
        blockEventId: null,
        blockDirty: false,
      };

      const mockSettings = {
        userId: mockUserId,
        pushTasksToCalendar: true,
        pushTasksFeedId: mockFeedId,
      };

      const mockFeed = {
        id: mockFeedId,
        type: "GOOGLE",
        url: mockCalendarId,
        accountId: mockAccountId,
        account: { id: mockAccountId },
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue(
        mockSettings
      );
      (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);
      (googleCalendar.createGoogleEvent as jest.Mock).mockResolvedValue({
        id: mockEventId,
      });

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(googleCalendar.createGoogleEvent).toHaveBeenCalledWith(
        mockAccountId,
        mockUserId,
        mockCalendarId,
        expect.objectContaining({
          title: "Test Task",
          description: "Scheduled by FluidCalendar",
          start: mockTask.scheduledStart,
          end: mockTask.scheduledEnd,
        })
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTaskId },
          data: {
            blockEventId: mockEventId,
            blockDirty: false,
          },
        })
      );
    });

    it("should update a calendar event when blockEventId exists", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: "Updated Task",
        status: "todo",
        scheduledStart: new Date("2025-06-15T14:00:00Z"),
        scheduledEnd: new Date("2025-06-15T15:00:00Z"),
        blockEventId: mockEventId,
        blockDirty: false,
      };

      const mockSettings = {
        userId: mockUserId,
        pushTasksToCalendar: true,
        pushTasksFeedId: mockFeedId,
      };

      const mockFeed = {
        id: mockFeedId,
        type: "GOOGLE",
        url: mockCalendarId,
        accountId: mockAccountId,
        account: { id: mockAccountId },
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue(
        mockSettings
      );
      (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);
      (googleCalendar.updateGoogleEvent as jest.Mock).mockResolvedValue({});

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(googleCalendar.updateGoogleEvent).toHaveBeenCalledWith(
        mockAccountId,
        mockUserId,
        mockCalendarId,
        mockEventId,
        expect.objectContaining({
          title: "Updated Task",
          start: mockTask.scheduledStart,
          end: mockTask.scheduledEnd,
          mode: "single",
        })
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTaskId },
          data: { blockDirty: false },
        })
      );
    });

    it("should delete a calendar event when task is completed", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: "Completed Task",
        status: "completed",
        scheduledStart: new Date("2025-06-15T10:00:00Z"),
        scheduledEnd: new Date("2025-06-15T11:00:00Z"),
        blockEventId: mockEventId,
        blockDirty: false,
      };

      const mockSettings = {
        userId: mockUserId,
        pushTasksToCalendar: true,
        pushTasksFeedId: mockFeedId,
      };

      const mockFeed = {
        id: mockFeedId,
        type: "GOOGLE",
        url: mockCalendarId,
        accountId: mockAccountId,
        account: { id: mockAccountId },
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue(
        mockSettings
      );
      (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);
      (googleCalendar.deleteGoogleEvent as jest.Mock).mockResolvedValue({});

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(googleCalendar.deleteGoogleEvent).toHaveBeenCalledWith(
        mockAccountId,
        mockUserId,
        mockCalendarId,
        mockEventId,
        "single"
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTaskId },
          data: {
            blockEventId: null,
            blockDirty: false,
          },
        })
      );
    });
  });

  describe("when push is disabled", () => {
    it("should delete event if task has blockEventId", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: "Task",
        status: "todo",
        scheduledStart: new Date("2025-06-15T10:00:00Z"),
        scheduledEnd: new Date("2025-06-15T11:00:00Z"),
        blockEventId: mockEventId,
        blockDirty: false,
      };

      const mockSettings = {
        userId: mockUserId,
        pushTasksToCalendar: false,
        pushTasksFeedId: mockFeedId,
      };

      const mockFeed = {
        id: mockFeedId,
        type: "GOOGLE",
        url: mockCalendarId,
        accountId: mockAccountId,
        account: { id: mockAccountId },
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue(
        mockSettings
      );
      (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);
      (googleCalendar.deleteGoogleEvent as jest.Mock).mockResolvedValue({});

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(googleCalendar.deleteGoogleEvent).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should mark task as blockDirty on Google API error during create", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: "Task",
        status: "todo",
        scheduledStart: new Date("2025-06-15T10:00:00Z"),
        scheduledEnd: new Date("2025-06-15T11:00:00Z"),
        blockEventId: null,
        blockDirty: false,
      };

      const mockSettings = {
        userId: mockUserId,
        pushTasksToCalendar: true,
        pushTasksFeedId: mockFeedId,
      };

      const mockFeed = {
        id: mockFeedId,
        type: "GOOGLE",
        url: mockCalendarId,
        accountId: mockAccountId,
        account: { id: mockAccountId },
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue(
        mockSettings
      );
      (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);
      (googleCalendar.createGoogleEvent as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTaskId },
          data: { blockDirty: true },
        })
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle missing task gracefully", async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue({
        pushTasksToCalendar: true,
      });

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(logger.warn).toHaveBeenCalled();
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it("should reject non-GOOGLE calendar feeds", async () => {
      const mockTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: "Task",
        status: "todo",
        scheduledStart: new Date("2025-06-15T10:00:00Z"),
        scheduledEnd: new Date("2025-06-15T11:00:00Z"),
        blockEventId: null,
        blockDirty: false,
      };

      const mockSettings = {
        userId: mockUserId,
        pushTasksToCalendar: true,
        pushTasksFeedId: mockFeedId,
      };

      const mockFeed = {
        id: mockFeedId,
        type: "OUTLOOK",
        url: mockCalendarId,
        accountId: mockAccountId,
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.autoScheduleSettings.findUnique as jest.Mock).mockResolvedValue(
        mockSettings
      );
      (prisma.calendarFeed.findUnique as jest.Mock).mockResolvedValue(mockFeed);

      await pushTaskBlock(mockUserId, mockTaskId);

      expect(logger.error).toHaveBeenCalled();
      expect(googleCalendar.createGoogleEvent).not.toHaveBeenCalled();
    });
  });
});
