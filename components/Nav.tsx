"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const onKnowledge = path?.startsWith("/knowledge");
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
      <nav className="nav">
        <Link href="/" className={`navlink ${!onKnowledge ? "active" : ""}`}>
          Get help
        </Link>
        <Link
          href="/knowledge"
          className={`navlink ${onKnowledge ? "active" : ""}`}
        >
          Knowledge base
        </Link>
      </nav>
    </header>
  );
}
