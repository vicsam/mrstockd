// A tiny tool to sell on MrStockd while you develop. No dependencies.
//
//   pnpm sample-tool              # listens on http://localhost:4000
//   PORT=4100 pnpm sample-tool    # another port
//   SAMPLE_TOOL_SECRET=abc pnpm sample-tool
//                                 # only accept calls carrying this secret;
//                                 # enter the same value as the listing's secret
//
// List it with the endpoint http://localhost:4000/api (local development only).
// POST any path with {"text": "..."} and get a short summary back.

import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4000);
const secret = process.env.SAMPLE_TOOL_SECRET ?? "";
const MAX_BODY = 100_000;

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

/** First two sentences, plus a few simple counts. */
function summarize(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const words = clean ? clean.split(" ").length : 0;
  return {
    summary: sentences.slice(0, 2).join(" "),
    sentences: sentences.length,
    words,
    readingTimeSeconds: Math.max(1, Math.round((words / 230) * 60)),
  };
}

const server = createServer((req, res) => {
  const environment = req.headers["x-mrstockd-environment"] ?? "direct";
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}  (${environment})`);

  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return send(res, 401, { error: "This tool needs its secret. Add it to the listing on MrStockd." });
  }

  if (req.method === "GET") {
    return send(res, 200, {
      tool: "MrStockd sample tool",
      usage: 'POST any path with JSON {"text": "..."} to get a short summary.',
      path: req.url,
      calledThrough: environment === "direct" ? "directly, not through MrStockd" : `MrStockd gateway (${environment} key)`,
    });
  }

  if (req.method !== "POST") return send(res, 405, { error: "Use GET or POST." });

  let size = 0;
  const chunks = [];
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY) {
      send(res, 413, { error: "Send at most 100 KB of text." });
      req.destroy();
    } else chunks.push(chunk);
  });
  req.on("end", () => {
    if (res.writableEnded) return;
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      return send(res, 400, { error: 'Send JSON like {"text": "..."}.' });
    }
    if (typeof body.text !== "string" || !body.text.trim()) {
      return send(res, 400, { error: 'Send JSON like {"text": "..."} with some text in it.' });
    }
    send(res, 200, summarize(body.text));
  });
});

server.listen(port, () => {
  console.log(`Sample tool listening on http://localhost:${port}`);
  console.log(`List it on MrStockd with the endpoint http://localhost:${port}/api`);
  if (secret) console.log("Calls must carry the secret you set in SAMPLE_TOOL_SECRET.");
});
