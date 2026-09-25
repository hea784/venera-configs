// Security audit for the extra comic sources in _extra_sources.json.
// Fails (exit 1) when a source breaks syntax, contacts a domain outside its
// allowlist, or contains a pattern on the blocklist.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const BLOCKED = [
  [/document\.cookie/, "accesses document.cookie (credential theft vector)"],
  [/localStorage|sessionStorage/, "accesses web storage"],
  [/WebSocket/, "opens a WebSocket"],
  [/child_process/, "uses child_process"],
  [/\brequire\s*\(/, "uses require()"],
  [/\bXMLHttpRequest/, "uses XMLHttpRequest"],
  [/\bfetch\s*\(/, "uses fetch (sources must use the Network api)"],
];

// The Dean Edwards p.a.c.k.e.r unpacker idiom is the one allowed eval use:
// eval(packed.replace(/^eval/, ""))
const UNPACKER_EVAL = /eval\(\s*\w+\.replace\(\s*\/\^eval\/\s*,\s*(["'])\s*\1\s*\)\s*\)/g;

function extractHosts(code) {
  const hosts = new Set();
  for (const match of code.matchAll(/https?:\/\/[^"'\s\\)]+/g)) {
    try {
      hosts.add(new URL(match[0]).hostname);
    } catch {
      hosts.add(match[0]);
    }
  }
  return hosts;
}

function hostAllowed(host, allowed) {
  return allowed.some((a) => host === a || host.endsWith("." + a));
}

const extras = JSON.parse(readFileSync("_extra_sources.json", "utf8"));
const lines = ["## 🔎 Extra source audit", ""];

let failed = false;
for (const entry of extras) {
  const file = entry.fileName;
  const section = [`### ${entry.name} (\`${file}\`)`];
  let ok = true;

  const syntax = spawnSync("node", ["--check", file], { encoding: "utf8" });
  if (syntax.status !== 0) {
    ok = false;
    section.push("- ❌ **syntax error**");
    section.push("```");
    section.push((syntax.stderr || syntax.stdout || "").trim());
    section.push("```");
  } else {
    section.push("- ✅ syntax ok");
  }

  const code = readFileSync(file, "utf8");
  const hosts = extractHosts(code);
  const strangers = [...hosts].filter(
    (h) => !hostAllowed(h, entry.allowedDomains ?? []),
  );
  if (strangers.length > 0) {
    ok = false;
    section.push(`- ❌ **contacts domains outside the allowlist**: ${strangers.join(", ")}`);
  } else {
    section.push(`- ✅ domains ok (${[...hosts].join(", ") || "none"})`);
  }

  const codeNoUnpacker = code.replace(UNPACKER_EVAL, "");
  const hits = [];
  for (const [pattern, reason] of BLOCKED) {
    if (pattern.test(codeNoUnpacker)) {
      hits.push(reason);
    }
  }
  if (/eval\(/.test(codeNoUnpacker)) {
    hits.push("contains an eval() outside the known unpacker idiom");
  }
  if (hits.length > 0) {
    ok = false;
    for (const hit of hits) {
      section.push(`- ❌ **${hit}**`);
    }
  } else {
    section.push("- ✅ blocklist ok (unpacker eval allowed)");
  }

  section.push("");
  lines.push(...section, "");
  if (!ok) {
    failed = true;
  }
}

const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}
if (failed) {
  console.error("AUDIT FAILED");
  process.exit(1);
}
