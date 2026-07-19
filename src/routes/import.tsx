import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import JSZip from "jszip";
import { isProtected } from "@/lib/protectedPaths";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "SDT — Secure Zip Import" },
      {
        name: "description",
        content:
          "Staging area to inspect a zip archive and select non-protected files for import into the Sovereign Deterministic Terminal.",
      },
      { name: "author", content: "Ayub Abdul Hussain" },
    ],
  }),
  component: ImportPage,
});

interface ZipEntry {
  path: string;
  size: number;
  protected: boolean;
  text?: string;
  binary: boolean;
}

const TEXT_EXT = /\.(ts|tsx|js|jsx|json|md|css|html|svg|txt|yml|yaml|toml|env|gitignore)$/i;

function ImportPage() {
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      entries.filter((e) =>
        filter ? e.path.toLowerCase().includes(filter.toLowerCase()) : true,
      ),
    [entries, filter],
  );

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setEntries([]);
    setSelected(new Set());
    setPreview(null);
    try {
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const out: ZipEntry[] = [];
      const names = Object.keys(zip.files).sort();
      for (const name of names) {
        const f = zip.files[name];
        if (f.dir) continue;
        const isText = TEXT_EXT.test(name);
        let text: string | undefined;
        let size = 0;
        if (isText) {
          text = await f.async("string");
          size = text.length;
        } else {
          const u8 = await f.async("uint8array");
          size = u8.byteLength;
        }
        out.push({
          path: name,
          size,
          protected: isProtected(name),
          text,
          binary: !isText,
        });
      }
      setEntries(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function selectAllSafe() {
    setSelected(new Set(entries.filter((e) => !e.protected).map((e) => e.path)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function exportSelection() {
    const zip = new JSZip();
    for (const path of selected) {
      const entry = entries.find((e) => e.path === path);
      if (!entry || entry.protected) continue;
      if (entry.text !== undefined) {
        zip.file(path, entry.text);
      }
    }
    const manifest = {
      generatedAt: new Date().toISOString(),
      count: selected.size,
      files: Array.from(selected).filter(
        (p) => !entries.find((e) => e.path === p)?.protected,
      ),
      protectedSkipped: entries
        .filter((e) => e.protected && selected.has(e.path))
        .map((e) => e.path),
    };
    zip.file("_MANIFEST.json", JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sdt-import-selection.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  const previewEntry = preview
    ? entries.find((e) => e.path === preview) ?? null
    : null;

  return (
    <main className="min-h-screen bg-black text-zinc-200 font-mono p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-xl tracking-widest font-bold">
            SECURE ZIP IMPORT — STAGING BAY
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Upload → inspect → select non-protected files → export filtered zip
            + manifest. Nothing is written to the project from this page.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="px-3 py-2 border border-emerald-900 text-emerald-400 hover:bg-emerald-950/40 cursor-pointer">
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            LOAD ZIP
          </label>
          <input
            type="text"
            placeholder="filter path..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 w-64"
          />
          <button
            type="button"
            onClick={selectAllSafe}
            disabled={!entries.length}
            className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 disabled:opacity-40"
          >
            SELECT ALL SAFE
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!selected.size}
            className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 disabled:opacity-40"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={exportSelection}
            disabled={!selected.size}
            className="px-3 py-2 border border-amber-900 text-amber-400 hover:bg-amber-950/40 disabled:opacity-40"
          >
            EXPORT SELECTION ({selected.size})
          </button>
          {busy && <span className="text-zinc-500">PARSING…</span>}
          {error && <span className="text-red-400">ERR: {error}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="border border-zinc-800 bg-zinc-950/40 max-h-[70vh] overflow-auto">
            <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-3 py-2 text-[10px] tracking-widest text-zinc-500 grid grid-cols-[24px_1fr_80px_80px] gap-2">
              <span></span>
              <span>PATH</span>
              <span className="text-right">SIZE</span>
              <span className="text-right">STATUS</span>
            </div>
            {filtered.length === 0 && !busy && (
              <div className="p-6 text-xs text-zinc-600 text-center">
                No archive loaded.
              </div>
            )}
            {filtered.map((e) => (
              <div
                key={e.path}
                className={`grid grid-cols-[24px_1fr_80px_80px] gap-2 items-center px-3 py-1 border-b border-zinc-900 text-xs ${
                  e.protected ? "opacity-60" : "hover:bg-zinc-900/60"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={e.protected}
                  checked={selected.has(e.path)}
                  onChange={() => toggle(e.path)}
                  className="accent-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setPreview(e.path)}
                  className="text-left truncate text-zinc-300 hover:text-emerald-400"
                  title={e.path}
                >
                  {e.path}
                </button>
                <span className="text-right text-zinc-500">{e.size}</span>
                <span
                  className={`text-right ${
                    e.protected
                      ? "text-red-400"
                      : e.binary
                        ? "text-zinc-500"
                        : "text-emerald-400"
                  }`}
                >
                  {e.protected ? "PROTECTED" : e.binary ? "BINARY" : "OK"}
                </span>
              </div>
            ))}
          </section>

          <section className="border border-zinc-800 bg-zinc-950/40 max-h-[70vh] overflow-auto">
            <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-3 py-2 text-[10px] tracking-widest text-zinc-500 flex justify-between">
              <span>PREVIEW</span>
              {previewEntry && (
                <span
                  className={
                    previewEntry.protected ? "text-red-400" : "text-emerald-400"
                  }
                >
                  {previewEntry.protected
                    ? "PROTECTED — CANNOT IMPORT"
                    : "SAFE TO IMPORT"}
                </span>
              )}
            </div>
            {!previewEntry && (
              <div className="p-6 text-xs text-zinc-600 text-center">
                Select a file to preview.
              </div>
            )}
            {previewEntry && previewEntry.binary && (
              <div className="p-6 text-xs text-zinc-500 text-center">
                Binary file — preview unavailable ({previewEntry.size} bytes).
              </div>
            )}
            {previewEntry && previewEntry.text !== undefined && (
              <pre className="p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all text-zinc-300">
                {previewEntry.text.slice(0, 20000)}
                {previewEntry.text.length > 20000 && "\n… [truncated]"}
              </pre>
            )}
          </section>
        </div>

        <footer className="text-[10px] text-zinc-600 tracking-widest text-center pt-4 border-t border-zinc-900">
          DESIGN PRINCIPAL — AYUB ABDUL HUSSAIN · PROTECTED PATHS ARE HARD-BLOCKED
        </footer>
      </div>
    </main>
  );
}