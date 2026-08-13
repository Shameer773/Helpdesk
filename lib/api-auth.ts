import { NextResponse } from "next/server";
import { getAuthContext, type AuthContext } from "./auth";

// Guards for Route Handlers. On failure they return a NextResponse to send back;
// on success they return the auth context. Usage:
//
//   const gate = await requireAdmin();
//   if (gate instanceof NextResponse) return gate;
//   // ...gate.user is an admin

export async function requireUser(): Promise<AuthContext | NextResponse> {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  return auth;
}

export async function requireAdmin(): Promise<AuthContext | NextResponse> {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: "Admins only." },
      { status: 403 },
    );
  }
  return auth;
}
