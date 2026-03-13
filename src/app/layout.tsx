import Script from "next/script";
import NextTopLoader from "nextjs-toploader";

import { Providers } from "@/components/providers";

import { metadata as baseMetadata } from "./metadata";

import "./globals.css";

export const metadata = baseMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex h-full flex-col bg-background antialiased">
        <NextTopLoader
          color="linear-gradient(to right, var(--brand-green), var(--brand-teal), var(--brand-cyan))"
          height={3}
          showSpinner={false}
          shadow={false}
        />
        {/* X (Twitter) Pixel */}
        <Script id="x-pixel" strategy="afterInteractive">
          {`
            !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
            a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
            twq('config','qefry');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
