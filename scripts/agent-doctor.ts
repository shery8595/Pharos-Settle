#!/usr/bin/env tsx
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { getAgentReadiness } from "../src/internal/agent/readiness.js";

const mock = process.argv.includes("--mock");

async function main() {
  const result = await getAgentReadiness({ mock, deploymentNetwork: "atlantic" });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ready && result.role !== "mock") {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ success: false, error: (e as Error).message }, null, 2));
  process.exit(1);
});
