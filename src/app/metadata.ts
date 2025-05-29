import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FluidCalendar",
  description: "A modern calendar and task management application",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/logo.svg", type: "image/svg+xml", sizes: "64x64" },
    ],
    apple: [{ url: "/logo.svg", type: "image/svg+xml", sizes: "180x180" }],
  },
};
