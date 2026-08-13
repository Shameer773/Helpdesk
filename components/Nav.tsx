"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function Nav({
  email,
  isAdmin,
  signedIn,
}: {
  email: string | null;
  isAdmin: boolean;
  signedIn: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const onKnowledge = path?.startsWith("/knowledge");
  const onAdmin = path?.startsWith("/admin");
  const onHelp = !onKnowledge && !onAdmin;

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="HelpDesk-Assist home">
        <span className="glyph" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a9 9 0 0 0-9 9v4a2 2 0 0 0 2 2h1v-6H5a7 7 0 0 1 14 0h-1v6h1a2 2 0 0 0 2-2v-4a9 9 0 0 0-9-9Z" />
            <path d="M12 21h3" />
          </svg>
        </span>
        <span className="brandtext">
          <span className="brandname">HelpDesk-Assist</span>
          <span className="brandsub">Company IT self-help</span>
        </span>
      </Link>
      <div className="spacer" />

      {signedIn && (
        <nav className="nav">
          <Link href="/" className={`navlink ${onHelp ? "active" : ""}`}>
            Get help
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/knowledge"
                className={`navlink ${onKnowledge ? "active" : ""}`}
              >
                Knowledge base
              </Link>
              <Link
                href="/admin"
                className={`navlink ${onAdmin ? "active" : ""}`}
              >
                Users
              </Link>
            </>
          )}
          {email && (
            <span className="navuser" title={isAdmin ? "Administrator" : "User"}>
              {email}
              {isAdmin && <span className="tag navtag">Admin</span>}
            </span>
          )}
          <button className="navlink navbtn" type="button" onClick={signOut}>
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
