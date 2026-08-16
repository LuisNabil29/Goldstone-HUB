import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeScorePercent } from "@/lib/simulator";

describe("progress helpers via shared math", () => {
  it("computes percent safely", () => {
    assert.equal(computeScorePercent(0, 0), 0);
    assert.equal(computeScorePercent(1, 2), 50);
  });
});
