export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex h-full flex-col bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
