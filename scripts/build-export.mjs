// Builds the app with `output: 'export'` to prove nothing depends on a server
// (Capacitor readiness). API routes cannot be exported, so `src/app/api` is
// moved aside for the duration of the build and always restored afterwards.
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";

const apiDir = "src/app/api";
const stashDir = ".api-stash";

if (existsSync(stashDir)) {
  console.error(`${stashDir} already exists — restore it to ${apiDir} first.`);
  process.exit(1);
}

const hadApi = existsSync(apiDir);
if (hadApi) renameSync(apiDir, stashDir);

let status = 1;
try {
  const result = spawnSync("pnpm", ["exec", "next", "build"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, BUILD_EXPORT: "1" },
  });
  status = result.status ?? 1;
} finally {
  if (hadApi) renameSync(stashDir, apiDir);
}

process.exit(status);
