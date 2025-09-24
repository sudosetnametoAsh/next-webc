import QueryProvider from "@/lib/query/query-provider";
import MSALProvider from "@/lib/msal/msal-provider";
import "../styles/layout.css"

export const metadata = {
  title: "Next Js App",
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MSALProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </MSALProvider>
      </body>
    </html>
  );
}
