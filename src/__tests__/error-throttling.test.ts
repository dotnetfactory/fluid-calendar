/**
 * @jest-environment jsdom
 */
import { ClientLogger } from "../lib/logger/client";

// Mock process.env.NODE_ENV
Object.defineProperty(process.env, "NODE_ENV", {
  value: "development",
  configurable: true,
});

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, count: 1 }),
  } as Response)
);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock newDate to return predictable dates
jest.mock("../lib/date-utils", () => ({
  newDate: jest.fn(() => new Date(Date.now())),
}));

// Mock console methods
console.error = jest.fn();
console.warn = jest.fn();
console.log = jest.fn();

describe("ClientLogger Error Throttling", () => {
  let logger: ClientLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // Create a new logger instance for each test
    logger = new ClientLogger({
      flushInterval: 100, // Short interval for testing
    });
  });

  afterEach(() => {
    // Clean up timers
    logger.cleanup();
  });

  it("should log an error the first time it occurs", async () => {
    // We need to mock the implementation of log to verify it's called
    const logSpy = jest.spyOn(logger, "log");

    await logger.error("Test error", { context: "test" }, "test-source");

    // Should have called log method
    expect(logSpy).toHaveBeenCalledWith(
      "error",
      "Test error",
      { context: "test" },
      "test-source"
    );
  });

  it("should throttle repeated errors within the time window", async () => {
    // We need to mock the implementation of log to verify it's called
    const logSpy = jest.spyOn(logger, "log");

    // Log the same error multiple times
    await logger.error("Test error", { context: "test" }, "test-source");
    await logger.error("Test error", { context: "test" }, "test-source");
    await logger.error("Test error", { context: "test" }, "test-source");

    // Should only log the first occurrence
    expect(logSpy).toHaveBeenCalledTimes(1);

    // Should log throttled messages as warnings in development
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(
      "Error throttled (occurred 2 times): Test error"
    );
    expect(console.warn).toHaveBeenCalledWith(
      "Error throttled (occurred 3 times): Test error"
    );
  });

  it("should log different errors separately", async () => {
    // We need to mock the implementation of log to verify it's called
    const logSpy = jest.spyOn(logger, "log");

    await logger.error("Error 1", { context: "test" }, "test-source");
    await logger.error("Error 2", { context: "test" }, "test-source");

    // Should log both errors
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it("should log the same error again after the time window", async () => {
    // We need to mock the implementation of log to verify it's called
    const logSpy = jest.spyOn(logger, "log");

    // Mock Date.now to control time
    const originalNow = Date.now;
    const mockNow = jest.fn();
    global.Date.now = mockNow;

    // First call - current time
    mockNow.mockReturnValue(1000);
    await logger.error("Test error", { context: "test" }, "test-source");

    // Second call - 30 seconds later (should be throttled)
    mockNow.mockReturnValue(31000);
    await logger.error("Test error", { context: "test" }, "test-source");

    // Third call - 70 seconds later (should be logged again with occurrence count)
    mockNow.mockReturnValue(71000);
    await logger.error("Test error", { context: "test" }, "test-source");

    // Should have logged the error twice
    expect(logSpy).toHaveBeenCalledTimes(2);

    // The second log call should include the occurrence count
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      "error",
      "Test error",
      { context: "test", occurrences: 3 },
      "test-source"
    );

    // Restore original Date.now
    global.Date.now = originalNow;
  });
});
