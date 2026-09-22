import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCvn,
  parseDtcsSid,
  parseMode06,
  parseMode09Ascii,
  parsePidBitmap,
  parseReadiness,
} from "./advanced.ts";

describe("parsePidBitmap", () => {
  it("reads 0100 supported PIDs", () => {
    const pids = parsePidBitmap("41 00 BE 3F A8 13");
    assert.ok(pids.includes(0x01));
    assert.ok(pids.includes(0x0c));
    assert.ok(pids.includes(0x0d));
    assert.ok(!pids.includes(0x02));
  });
});

describe("parseReadiness", () => {
  it("flags MIL on and misfire incomplete", () => {
    const r = parseReadiness("41 01 81 0E 65 05");
    const misfire = r.find((m) => m.id === "misfire");
    assert.equal(misfire?.available, true);
    assert.equal(misfire?.complete, false);
  });
});

describe("mode 09", () => {
  it("reads CALID ascii", () => {
    assert.equal(parseMode09Ascii("49 04 01 32 33 37 31 30", 0x04).slice(0, 4), "2371");
  });
  it("reads CVN", () => {
    assert.equal(parseCvn("49 06 01 A3 1C 90 E2"), "A31C90E2");
  });
});

describe("permanent DTCs", () => {
  it("parses mode 0A CAN frame", () => {
    assert.deepEqual(parseDtcsSid("4A 01 03 00", 0x4a), ["P0300"]);
  });
});

describe("mode 06", () => {
  it("flags a failing misfire monitor", () => {
    const tests = parseMode06("46 A2 0B 00 2A 00 14");
    assert.equal(tests[0]?.pass, false);
    assert.equal(tests[0]?.mid, "A2");
  });
});
