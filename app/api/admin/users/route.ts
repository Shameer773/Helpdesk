import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/api-auth";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// List all accounts (admins only).
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const users = (data ?? []).map((u) => ({
      ...u,
      // The env allowlist can make someone an effective admin even if their
      // stored role hasn't been changed. Reflect that in the listing.
      role: isAdminEmail(u.email) ? "admin" : u.role,
    }));
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Failed to load users.") },
      { status: 500 },
    );
  }
}

// Create a new account (admins only). The trigger on auth.users copies role /
// full_name from user_metadata into the profiles row.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    const password = body?.password as string | undefined;
    const fullName = (body?.fullName as string | undefined)?.trim() || null;
    const role = body?.role === "admin" ? "admin" : "user";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 },
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });
    if (error) throw error;

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Could not create the account.") },
      { status: 500 },
    );
  }
}

// Update a user's password or role, or delete the account (admins only).
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    const supabase = getServiceClient();

    if (typeof body?.password === "string") {
      if (body.password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: body.password,
      });
      if (error) throw error;
    }

    if (body?.role === "admin" || body?.role === "user") {
      const { error } = await supabase
        .from("profiles")
        .update({ role: body.role })
        .eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Could not update the account.") },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }
    if (id === gate.user.id) {
      return NextResponse.json(
        { error: "You can't delete your own account." },
        { status: 400 },
      );
    }
    const supabase = getServiceClient();
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Could not delete the account.") },
      { status: 500 },
    );
  }
}
