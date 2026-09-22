import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeOxygen,
  crossCount,
  decodeLambda,
  decodeO2Voltage,
  decodeTrimByte,
  simulateOxygen,
} from "./oxygen.ts";

function burst(kind: Parameters<typeof simulateOxygen>[0], n = 50, dt = 120) {
  return Array.from({ length: n }, (_, i) => simulateOxygen(kind, i * dt));
}

describe("decode O2 PID 14", () => {
  it("reads 0.80 V from 0xA0", () => {
    assert.equal(decodeO2Voltage([0xa0, 0x80]).v, 0.8);
    assert.equal(decodeO2Voltage([0xa0, 0x80]).stft, 0);
  });
  it("reads trim +25 %", () => {
    assert.equal(decodeTrimByte(160), 25);
  });
});

describe("lambda", () => {
  it("decodes 1.000", () => {
    assert.equal(decodeLambda([0x80, 0x00]), 1);
  });
});

describe("crossCount", () => {
  it("counts threshold crossings", () => {
    assert.equal(crossCount([0.2, 0.8, 0.2, 0.8], 0.45), 3);
  });
});

describe("analyzeOxygen", () => {
  it("does not sentence a sensor on the first samples", () => {
    const samples = burst("healthy", 4);
    const r = analyzeOxygen(samples, "gasolina", []);
    assert.equal(r.ready, false);
    assert.equal(r.overall.tone, "idle");
  });
  it("flags a healthy switching sensor", () => {
    const r = analyzeOxygen(burst("healthy"), "gasolina", []);
    assert.equal(r.ready, true);
    assert.equal(r.sensors[0]?.tone, "ok");
    assert.equal(r.trims.tone, "ok");
    assert.ok((r.preHz ?? 0) >= 0.8);
  });
  it("flags lean voltage and P0171 trims", () => {
    const r = analyzeOxygen(burst("lean"), "gasolina", ["P0171"]);
    assert.equal(r.sensors[0]?.tone, "bad");
    assert.match(r.sensors[0]?.title ?? "", /pobre/i);
    assert.equal(r.trims.tone, "warn");
    assert.match(r.trims.title, /Pobre/);
    assert.ok(r.codesHint.includes("P0171"));
  });
  it("flags a lazy upstream as P0133", () => {
    const r = analyzeOxygen(burst("lazy", 70), "gasolina", []);
    assert.equal(r.sensors[0]?.tone, "warn");
    assert.match(r.sensors[0]?.title ?? "", /lento|P0133/i);
    assert.ok(r.codesHint.includes("P0133"));
  });
  it("flags cat when post copies pre", () => {
    const r = analyzeOxygen(burst("cat", 50, 80), "gasolina", ["P0420"]);
    assert.equal(r.cat.tone, "warn");
    assert.ok(r.codesHint.includes("P0420"));
  });
  it("keeps diesel on lambda, not zirconia", () => {
    const r = analyzeOxygen(burst("diesel"), "diesel", []);
    assert.match(r.overall.title, /Lambda/);
    assert.equal(r.trims.tone, "idle");
  });
});
