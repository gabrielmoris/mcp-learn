import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "files-cleanup",
  version: "1.0.0",
});

server.tool(
  "find-useless-files",
  "Find useless files in a directory",
  {
    directory: z.string().describe("The directory to search"),
  },
  async ({ directory }) => {
    return { content: [{ type: "text", text: `All right in the directory: ${directory}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
