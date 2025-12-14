import { PropsWithChildren } from "react";

import { SessionProvider } from "./SessionProvider";
import { StoreInitializer } from "./StoreInitializer";
import { TanstackQueryProvider } from "./TanstackQueryProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <TanstackQueryProvider>
      <ThemeProvider attribute="data-theme" enableSystem={true}>
        <SessionProvider>
          <StoreInitializer />
          {children}
        </SessionProvider>
      </ThemeProvider>
    </TanstackQueryProvider>
  );
}
