// Samler de statiske landingssidene i dist/ for Netlify.
// Backend-avhengige deler (admin-private/, server/, server.mjs) holdes utenfor,
// siden statisk hosting ikke kjører Node-serveren.
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const copyExtensions = [".html", ".css", ".js"];
const copyEntries = ["assets", "_redirects"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const rootFiles = await readdir(root, { withFileTypes: true });
const staticFiles = rootFiles
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => copyExtensions.some((ext) => name.endsWith(ext)));

for (const name of [...staticFiles, ...copyEntries]) {
  await cp(join(root, name), join(dist, name), { recursive: true });
}

console.log(`Bygget dist/ med ${staticFiles.length} filer + ${copyEntries.join(", ")}`);
