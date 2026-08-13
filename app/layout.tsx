import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "HelpDesk-Assist",
  description:
    "Describe an IT problem and get a step-by-step fix built from your company's own guides.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  return (
    <html lang="en">
      <body>
        <Nav
          email={auth?.user.email ?? null}
          isAdmin={auth?.isAdmin ?? false}
          signedIn={!!auth}
        />
        {children}
      </body>
    </html>
  );
}
