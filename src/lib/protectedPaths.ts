/**
 * Files that must never be overwritten by a zip import.
 * Core SDT logic, ledger, worker, root routes, and infra.
 */
export const PROTECTED_PATHS: readonly string[] = [
  "src/lib/SDTStateEngine.ts",
  "src/lib/ledger.ts",
  "src/lib/binance.functions.ts",
  "src/components/RihalDashboard.tsx",
  "src/workers/sdt.worker.ts",
  "src/routes/__root.tsx",
  "src/routes/index.tsx",
  "src/router.tsx",
  "src/server.ts",
  "src/start.ts",
  "src/routeTree.gen.ts",
  "src/styles.css",
  "package.json",
  "bun.lockb",
  "bunfig.toml",
  "vite.config.ts",
  "tsconfig.json",
  "components.json",
  "eslint.config.js",
  ".prettierrc",
  ".prettierignore",
  "AGENTS.md",
];

export const PROTECTED_PREFIXES: readonly string[] = [
  ".git/",
  "node_modules/",
  ".lovable/",
  ".env",
];

export function isProtected(path: string): boolean {
  const p = path.replace(/^\/+/, "");
  if (PROTECTED_PATHS.includes(p)) return true;
  return PROTECTED_PREFIXES.some((pref) => p.startsWith(pref));
}