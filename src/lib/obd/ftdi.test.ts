import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeFtdiBaud, stripFtdiStatus } from "./ftdi.ts";

describe("encodeFtdiBaud", () => {
  it("encodes 115200 as 0x001A", () => {
    const { value, index } = encodeFtdiBaud(115200);
    assert.equal(value, 0x001a);
    assert.equal(index, 0);
  });
  it("encodes 38400 as 0xC04E", () => {
    const { value } = encodeFtdiBaud(38400);
    assert.equal(value, 0xc04e);
  });
  it("encodes 9600 as 0x4138", () => {
    const { value } = encodeFtdiBaud(9600);
    assert.equal(value, 0x4138);
  });
  it("puts port in index for H-series", () => {
    const { index } = encodeFtdiBaud(115200, true, 0);
    assert.equal(index, 1);
  });
});

describe("stripFtdiStatus", () => {
  it("drops the 2-byte modem header per 64-byte packet", () => {
    const pkt = new Uint8Array([0x01, 0x60, 0x41, 0x54, 0x5a, 0x0d]);
    const out = stripFtdiStatus(pkt, 64);
    assert.deepEqual([...out], [0x41, 0x54, 0x5a, 0x0d]);
  });
});
