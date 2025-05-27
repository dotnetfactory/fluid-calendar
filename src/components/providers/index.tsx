import { PropsWithChildren } from "react";

import { SessionProvider } from "./SessionProvider";
import { TRPCProvider } from "./TRPCProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <TRPCProvider>
      <ThemeProvider attribute="data-theme" enableSystem={true}>
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </TRPCProvider>
  );
}
