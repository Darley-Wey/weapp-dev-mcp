import { ensureConnectionParameters } from "../src/tools/common.ts";

try {
  const result = ensureConnectionParameters.parse(undefined);
  if (!result || result.reconnect !== false) {
    console.error("Unexpected parse result:", result);
    process.exit(1);
  }
  console.log("mp_ensureConnection accepts empty input.");
} catch (error) {
  console.error("mp_ensureConnection rejected empty input:", error);
  process.exit(1);
}
