import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    // Set viewport to a large size
    viewport: { width: 1920, height: 1080 },
    // Launch the browser maximized
    launchOptions: {},
  },

  /* Configure projects for major browsers */
  projects: [
    // Auth setup — runs once to create shared session state
    {
      name: "setup",
      testDir: "./tests",
      testMatch: /fixtures\/auth\.ts/,
    },

    // Unauthenticated core tests (smoke, auth flows, reset-password)
    {
      name: "chromium",
      testDir: "./tests",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {},
      },
      testIgnore: [
        /fixtures\//,
        /debug\.spec/,
        /google-calendar\.spec/,
        /(?<!google-)calendar\.spec/,
        /tasks\.spec/,
        /settings\.spec/,
        /verify-build\.spec/,
        /focus\.spec/,
        /import-export\.spec/,
      ],
    },

    // Unauthenticated SaaS tests (pricing, learn, subscription, open-source)
    {
      name: "chromium-saas",
      testDir: "./saas/tests",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {},
      },
      testMatch: [
        /open-source\.spec/,
        /learn\.spec/,
        /subscription\.spec/,
      ],
    },

    // Authenticated core tests — depend on setup project
    {
      name: "authenticated",
      testDir: "./tests",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: [
        /(?<!google-)calendar\.spec/,
        /tasks\.spec/,
        /settings\.spec/,
        /verify-build\.spec/,
        /focus\.spec/,
        /import-export\.spec/,
      ],
    },

    // Authenticated SaaS tests — depend on setup project
    {
      name: "authenticated-saas",
      testDir: "./saas/tests",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: [/booking\.spec/, /admin\.spec/, /pricing\.spec/],
    },

    // OS build verification — run explicitly via test:e2e:os or test:e2e:full
    {
      name: "os-build",
      testDir: "./saas/tests",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        baseURL: "http://localhost:3001",
      },
      testMatch: [/open-source\.spec/],
    },

    // Integration tests — run explicitly via test:e2e:integration
    {
      name: "integration",
      testDir: "./tests",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: [/google-calendar\.spec/],
    },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
