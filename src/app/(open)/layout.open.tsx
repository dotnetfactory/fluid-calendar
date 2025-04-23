import "@/app/globals.css";

import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function OpenSourceHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      forcedTheme="light"
      enableSystem={false}
    >
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
