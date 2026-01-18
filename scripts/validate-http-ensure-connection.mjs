import { spawn } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

const port = 4317;
const serverProcess = spawn(
  "node",
  ["--import", "tsx", "scripts/http-server.mjs"],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      WEAPP_TEST_PORT: String(port),
    },
  }
);

serverProcess.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
});
serverProcess.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

let serverExited = false;
let terminateRequested = false;
serverProcess.on("exit", (code, signal) => {
  if (terminateRequested) {
    return;
  }
  serverExited = true;
  console.error(
    `Server exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"}).`
  );
});

function waitForReady() {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => {
      reject(new Error("Server did not become ready in time."));
    }, 10000);

    const onExit = () => {
      clearTimeout(deadline);
      reject(new Error("Server exited before becoming ready."));
    };

    const onData = (chunk) => {
      const text = String(chunk);
      if (text.includes("server is running on HTTP Stream")) {
        clearTimeout(deadline);
        serverProcess.stdout.off("data", onData);
        serverProcess.off("exit", onExit);
        resolve();
      }
    };

    serverProcess.stdout.on("data", onData);
    serverProcess.once("exit", onExit);
  });
}

async function main() {
  await waitForReady();

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://localhost:${port}/mcp`)
  );
  const client = new Client(
    { name: "ensure-connection-test", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    await client.request(
      {
        method: "tools/call",
        params: {
          name: "mp_ensureConnection",
          arguments: undefined,
        },
      },
      CallToolResultSchema
    );
  } catch (error) {
    console.error("Tool call returned error (expected without devtools):", error);
  }

  await transport.close();
  terminateRequested = true;
  serverProcess.kill();

  await new Promise((resolve) => {
    serverProcess.on("exit", resolve);
  });

  if (serverExited) {
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  terminateRequested = true;
  serverProcess.kill();
  process.exit(1);
}
