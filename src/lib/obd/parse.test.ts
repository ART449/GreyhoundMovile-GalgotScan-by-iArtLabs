import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeRpm,
  decodeVoltage,
  dtcFromBytes,
  parseDtcs,
  parseMil,
  parseVin,
  pidPayload,
} from "./parse.ts";

describe("dtcFromBytes", () => {
  it("decodes P0300 and P0171", () => {
    assert.equal(dtcFromBytes(0x03, 0x00), "P0300");
    assert.equal(dtcFromBytes(0x01, 0x71), "P0171");
    assert.equal(dtcFromBytes(0x00, 0x00), null);
  });
});

describe("parseDtcs", () => {
  it("reads a single mode 03 ISO frame", () => {
    assert.deepEqual(parseDtcs("43 03 00 00 00 00 00"), ["P0300"]);
  });
  it("reads two codes without CAN count", () => {
    assert.deepEqual(parseDtcs("43 01 71 04 42"), ["P0171", "P0442"]);
  });
  it("reads CAN count format P0300", () => {
    assert.deepEqual(parseDtcs("43 01 03 00"), ["P0300"]);
  });
  it("reads CAN two codes", () => {
    assert.deepEqual(parseDtcs("43 02 03 00 01 71"), ["P0300", "P0171"]);
  });
  it("reads empty CAN frame", () => {
    assert.deepEqual(parseDtcs("43 00"), []);
  });
});

describe("parseMil", () => {
  it("detects lamp on with one code", () => {
    assert.deepEqual(parseMil("41 01 81 00 00 00"), { mil: true, count: 1 });
  });
  it("detects lamp off", () => {
    assert.deepEqual(parseMil("41 01 00 00 00 00"), { mil: false, count: 0 });
  });
});

describe("pids", () => {
  it("decodes RPM 2450", () => {
    const p = pidPayload("41 0C 26 48", 0x41, 0x0c);
    assert.ok(p);
    assert.equal(decodeRpm(p), 2450);
  });
  it("decodes voltage 14.1", () => {
    const p = pidPayload("41 42 37 14", 0x41, 0x42);
    assert.ok(p);
    assert.equal(decodeVoltage(p), 14.1);
  });
});

describe("parseVin", () => {
  it("assembles 0902 frames", () => {
    const raw =
      "49 02 01 00 33 4E 36 49 02 02 41 44 33 36 41 49 02 03 35 4C 4B 32 30 49 02 04 34 39 31 38";
    const vin = parseVin(raw);
    assert.equal(vin.slice(0, 3), "3N6");
    assert.ok(vin.length >= 11);
  });
});
