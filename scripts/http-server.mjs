import { FastMCP } from "fastmcp";

import { createTools } from "../src/tools.js";
import { globalTimeoutMs } from "../src/config.js";
import { WeappAutomatorManager } from "../src/weappClient.js";

const port = Number(process.env.WEAPP_TEST_PORT ?? 4317);

const manager = new WeappAutomatorManager();
const server = new FastMCP({
  name: "weapp-dev-mcp",
  version: "0.1.0",
  instructions:
    "Controls WeChat Mini Program projects through WeChat DevTools using miniprogram-automator.",
});

const tools = createTools(manager).map((tool) => ({
  ...tool,
  timeoutMs: tool.timeoutMs ?? globalTimeoutMs,
}));
server.addTools(tools);

server.on("disconnect", async () => {
  await manager.close();
});

await server.start({
  transportType: "httpStream",
  httpStream: { port },
});
