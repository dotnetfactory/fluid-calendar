import { PropsWithChildren } from "react";

import { SubscriptionGuard } from "@saas/components/subscription";

import { SessionProvider } from "./SessionProvider";
import { StoreInitializer } from "./StoreInitializer";
import { TanstackQueryProvider } from "./TanstackQueryProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <TanstackQueryProvider>
      <ThemeProvider attribute="data-theme" enableSystem={true}>
        <SessionProvider>
          <SubscriptionGuard>
            <StoreInitializer />
            {children}
          </SubscriptionGuard>
        </SessionProvider>
      </ThemeProvider>
    </TanstackQueryProvider>
  );
}
