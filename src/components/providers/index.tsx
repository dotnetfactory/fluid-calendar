import { PropsWithChildren } from "react";

import { SessionProvider } from "./SessionProvider";
import { TanstackQueryProvider } from "./TanstackQueryProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <TanstackQueryProvider>
      <ThemeProvider attribute="data-theme" enableSystem={true}>
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </TanstackQueryProvider>
  );
}
