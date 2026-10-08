import QueryProvider from "@/lib/providers/query-provider";
import MSALProvider from "@/lib/providers/msal-provider";
import ThemeProvider from "@/lib/providers/theme-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

export const metadata = {
  title: "STI College Clearance Portal",
  description: "Official Institutional Clearance & Credential Verification System",
};

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.className} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MSALProvider>
            <QueryProvider>{children}</QueryProvider>
            <Toaster />
          </MSALProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
