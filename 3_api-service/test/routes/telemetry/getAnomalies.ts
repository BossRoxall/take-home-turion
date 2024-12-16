import { test } from "node:test";
import * as assert from "node:assert";
import { build } from "../../helper";

test("default root route", async (t) => {
  const app = await build(t);

  const res = await app.inject({
    url: "/api/v1/telemetry",
  });
  assert.ok(
    JSON.parse(res.payload).totalRecords >= 0,
    "Invalid totalRecords value",
  );
});
