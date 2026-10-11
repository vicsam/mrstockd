import { existsSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGatewayClient } from "./gateway-client.js";
import { createKeyring, parseKeyList } from "./keyring.js";
import { createMrstockdServer } from "./server.js";

/**
 * Local (stdio) entry point for desktop AI apps, Cursor and other MCP clients.
 *
 *   MRSTOCKD_GATEWAY_URL  the gateway, default http://localhost:8787
 *   MRSTOCKD_API_KEYS     your MrStockd keys, comma or space separated
 *
 * Both can also go in the repo-root .env; variables set by the MCP client win.
 * Logs go to stderr: stdout carries the MCP protocol.
 */
const rootEnv = new URL("../../../.env", import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const gatewayUrl = process.env.MRSTOCKD_GATEWAY_URL ?? "http://localhost:8787";
const { keys, malformed } = parseKeyList(process.env.MRSTOCKD_API_KEYS);
if (malformed) console.error(`mrstockd: ignored ${malformed} value(s) in MRSTOCKD_API_KEYS that aren't MrStockd keys (mrs_live_… or mrs_test_…).`);

const client = createGatewayClient({ baseUrl: gatewayUrl });
const server = createMrstockdServer({ client, keys: createKeyring(client, keys) });
await server.connect(new StdioServerTransport());
console.error(`mrstockd MCP server ready (gateway ${gatewayUrl}, ${keys.length} key${keys.length === 1 ? "" : "s"})`);
