import QueryProvider from "@/lib/query/query-provider";
import MSALProvider from "@/lib/msal/msal-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

export const metadata = {
  title: "Next Js App",
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
    <html lang="en" className={geist.className}>
      <body>
        <MSALProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </MSALProvider>
      </body>
    </html>
  );
}
