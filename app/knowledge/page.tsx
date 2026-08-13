"use client";

import { useEffect, useRef, useState } from "react";

type DocRow = {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
  chars: number;
  chunks: number;
};

function fileKind(name: string): "pdf" | "txt" {
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "txt";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadDocs() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents.");
      setDocs(data.documents as DocRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setWarning(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (category.trim()) form.append("category", category.trim());
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      if (data.warning) setWarning(data.warning);
      setCategory("");
      if (fileRef.current) fileRef.current.value = "";
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onReindex() {
    setReindexing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/reindex", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reindex failed.");
      setNotice(
        `Reindexed ${data.indexedDocuments}/${data.documents} document(s) into ${data.totalChunks} searchable chunks.`,
      );
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reindex failed.");
    } finally {
      setReindexing(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="wrap wrap-wide">
      <span className="eyebrow">Company Knowledge Base</span>
      <h1 className="page-title">Knowledge Base Management</h1>
      <p className="page-lede">
        Upload the IT documents the assistant is allowed to use. The AI answers{" "}
        <b>only</b> from what you publish here. Supported files: PDF, TXT, MD.
      </p>

      <form className="dropzone" onSubmit={onUpload}>
        <span className="dz-ic" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>
        <div className="dz-body">
          <b>Add a document to the knowledge base</b>
          <p>Choose a PDF or text file, optionally tag it with a category.</p>
          <div className="dz-controls" style={{ marginTop: 10 }}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" />
            <input
              className="text-input"
              type="text"
              placeholder="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-violet" type="submit" disabled={uploading}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {uploading ? "Uploading…" : "Upload file"}
        </button>
      </form>

      {warning && <div className="errorbox" style={{ borderColor: "var(--amber)", color: "var(--amber)", background: "var(--amber-wash)" }}>{warning}</div>}
      {notice && <div className="errorbox" style={{ borderColor: "var(--green)", color: "var(--green)", background: "var(--green-wash)" }}>{notice}</div>}
      {error && <div className="errorbox">{error}</div>}

      <div
        className="table-head"
        style={{
          margin: "10px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span className="eyebrow">Published knowledge</span>
        <button
          className="btn"
          type="button"
          onClick={onReindex}
          disabled={reindexing || docs.length === 0}
          title="Re-chunk and re-embed every document"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {reindexing ? "Reindexing…" : "Reindex all"}
        </button>
      </div>

      {loadingList ? (
        <div className="empty">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="empty">
          No documents yet. Upload your first IT guide above so the assistant has
          something to work from.
        </div>
      ) : (
        <div className="tablescroll">
          <table className="kbtable">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Uploaded</th>
                <th>Text</th>
                <th>Indexed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="fname">
                      <span className={`fileicon fi-${fileKind(d.name)}`}>
                        {fileKind(d.name).toUpperCase()}
                      </span>
                      <span className="nm">{d.name}</span>
                    </div>
                  </td>
                  <td>
                    {d.category ? (
                      <span className="tag">{d.category}</span>
                    ) : (
                      <span className="muted-cell">—</span>
                    )}
                  </td>
                  <td className="muted-cell">{formatDate(d.created_at)}</td>
                  <td className="muted-cell">
                    {d.chars.toLocaleString()} chars
                  </td>
                  <td>
                    {d.chunks > 0 ? (
                      <span className="tag" style={{ color: "var(--green)", borderColor: "var(--green)" }}>
                        {d.chunks} chunk{d.chunks === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="tag" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
                        not indexed
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="rowbtn"
                      title="Remove"
                      onClick={() => onDelete(d.id)}
                      disabled={deletingId === d.id}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="footnote">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        When a file is uploaded, its text is extracted and stored so the assistant
        can read it. Removing a document immediately stops the AI from using it.
        Only administrators can reach this page.
      </p>
    </main>
  );
}
