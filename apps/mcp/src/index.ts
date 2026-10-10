import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * MrStockd MCP server: lets any MCP-capable agent
 * search the store and request purchases.
 *
 * Money rules enforced server-side, never by the model:
 *   - prices come from the database, not from tool arguments
 *   - every purchase needs the human's approval in PayPal unless it is
 *     under the agent's approval threshold and within its monthly budget
 *   - each purchase request carries an idempotency key
 *
 * Runs over stdio for local use. A Streamable HTTP transport for the
 * hosted version is added alongside the purchase flow.
 */
const server = new McpServer({ name: "mrstockd", version: "0.0.0" });

server.registerTool(
  "search_tools",
  {
    title: "Search MrStockd",
    description: "Find AI tools for a task. Returns matching listings with price and pricing model.",
    inputSchema: {
      query: z.string().min(2).max(500).describe("What the tool should do"),
      maxPriceUsd: z.number().positive().max(10_000).optional(),
    },
  },
  async ({ query }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({ query, results: [], note: "Search is wired to the catalog in week 2." }),
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
