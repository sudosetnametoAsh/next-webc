import QueryProvider from "@/lib/providers/query-provider";
import MSALProvider from "@/lib/providers/msal-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "WebC: A Clearance App",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
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
      <body>
        <ThemeProvider>
          <MSALProvider>
            <QueryProvider>{children}</QueryProvider>
            <Toaster />
          </MSALProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
