import { Inter } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";


const inter = Inter({ subsets: ["latin"] });

export default function OpenSourceHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>FluidCalendar - Open Source Intelligent Calendar</title>
        <meta
          name="description"
          content="The open-source intelligent calendar that adapts to your workflow. Experience seamless task scheduling powered by AI, designed to make your time management effortless."
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="data-theme"
          forcedTheme="light"
          enableSystem={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
