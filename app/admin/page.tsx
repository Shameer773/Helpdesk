"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "user";
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// A readable random password to hand to a new user.
function suggestPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const rnd = new Uint32Array(12);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < rnd.length; i++) out += chars[rnd[i] % chars.length];
  return out;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [password, setPassword] = useState(suggestPassword());
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users.");
      setUsers(data.users as UserRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the account.");
      setNotice(
        `Account created for ${email}. Share the temporary password below — they can change it after signing in.`,
      );
      setEmail("");
      setFullName("");
      setRole("user");
      setPassword(suggestPassword());
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the account.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function onResetPassword(u: UserRow) {
    const next = suggestPassword();
    if (
      !confirm(
        `Reset the password for ${u.email}?\n\nNew temporary password:\n${next}\n\nCopy it now — it won't be shown again.`,
      )
    )
      return;
    setBusyId(u.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, password: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      setNotice(`Password reset for ${u.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleRole(u: UserRow) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    setBusyId(u.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(u: UserRow) {
    if (!confirm(`Delete the account for ${u.email}? This cannot be undone.`))
      return;
    setBusyId(u.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/users?id=${encodeURIComponent(u.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap wrap-wide">
      <span className="eyebrow">Administration</span>
      <h1 className="page-title">User Management</h1>
      <p className="page-lede">
        Create accounts for your team. Users can sign in and describe IT problems;
        admins can additionally manage the knowledge base and users.
      </p>

      <form className="ask-card formstack" onSubmit={onCreate}>
        <b>Invite a new user</b>
        <div className="ask-label">Email</div>
        <input
          className="text-input"
          type="email"
          placeholder="person@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="ask-label">Full name (optional)</div>
        <input
          className="text-input"
          type="text"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <div className="ask-label">Role</div>
        <select
          className="text-input"
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "admin")}
        >
          <option value="user">User — can get help</option>
          <option value="admin">Admin — full access</option>
        </select>
        <div className="ask-label">Temporary password</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="text-input"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            className="btn"
            type="button"
            onClick={() => setPassword(suggestPassword())}
          >
            Regenerate
          </button>
        </div>
        <div className="ask-row" style={{ marginTop: 14 }}>
          <span className="grow" />
          <button className="btn btn-violet" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>

      {notice && (
        <div
          className="errorbox"
          style={{
            borderColor: "var(--green)",
            color: "var(--green)",
            background: "var(--green-wash)",
          }}
        >
          {notice}
        </div>
      )}
      {error && <div className="errorbox">{error}</div>}

      <div className="table-head" style={{ margin: "16px 0 10px" }}>
        <span className="eyebrow">Accounts</span>
      </div>

      {loading ? (
        <div className="empty">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="empty">No accounts yet.</div>
      ) : (
        <div className="tablescroll">
          <table className="kbtable">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="nm">{u.email}</span>
                  </td>
                  <td className="muted-cell">{u.full_name || "—"}</td>
                  <td>
                    <span
                      className="tag userrole"
                      style={
                        u.role === "admin"
                          ? {
                              color: "var(--accent-ink)",
                              borderColor: "var(--accent-wash)",
                              background: "var(--accent-wash)",
                            }
                          : undefined
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="muted-cell">{formatDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => onToggleRole(u)}
                        disabled={busyId === u.id}
                      >
                        {u.role === "admin" ? "Make user" : "Make admin"}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => onResetPassword(u)}
                        disabled={busyId === u.id}
                      >
                        Reset password
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => onDelete(u)}
                        disabled={busyId === u.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
