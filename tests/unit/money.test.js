import { describe, expect, it } from "vitest";
import { addMinor, subtractMinor, sumSignedLedgerDeltas, parseDecimalToMinor, formatMinor } from "@/lib/money";

describe("parseDecimalToMinor", () => {
  it("converts whole and fractional decimal strings to integer minor units", () => {
    expect(parseDecimalToMinor("125.50")).toBe(12550);
    expect(parseDecimalToMinor("0")).toBe(0);
    expect(parseDecimalToMinor("10")).toBe(1000);
    expect(parseDecimalToMinor("10.5")).toBe(1050);
  });

  it("rejects missing, empty, negative, or overly precise input", () => {
    expect(() => parseDecimalToMinor(undefined)).toThrow();
    expect(() => parseDecimalToMinor("")).toThrow();
    expect(() => parseDecimalToMinor("-5")).toThrow();
    expect(() => parseDecimalToMinor("10.555")).toThrow();
    expect(() => parseDecimalToMinor("abc")).toThrow();
  });

  it("never produces floating-point drift for repeating decimals", () => {
    // 0.1 + 0.2 famously != 0.3 in floating point; minor-unit parsing must
    // not inherit that behavior for any individual value.
    expect(parseDecimalToMinor("0.10")).toBe(10);
    expect(parseDecimalToMinor("0.20")).toBe(20);
    expect(addMinor(parseDecimalToMinor("0.10"), parseDecimalToMinor("0.20"))).toBe(30);
  });
});

describe("addMinor / subtractMinor", () => {
  it("sums arbitrary amounts of minor-unit arguments", () => {
    expect(addMinor(100, 200, 300)).toBe(600);
    expect(addMinor()).toBe(0);
  });

  it("subtracts without floating point error", () => {
    expect(subtractMinor(55000, 50000)).toBe(5000);
    expect(subtractMinor(100, 150)).toBe(-50);
  });
});

describe("sumSignedLedgerDeltas", () => {
  it("sums signed deltas from a list of transactions", () => {
    const transactions = [
      { signedAmountMinor: 50000 },
      { signedAmountMinor: -20000 },
      { signedAmountMinor: -10000 },
    ];
    expect(sumSignedLedgerDeltas(transactions)).toBe(20000);
  });

  it("returns 0 for an empty transaction list", () => {
    expect(sumSignedLedgerDeltas([])).toBe(0);
  });
});

describe("formatMinor", () => {
  it("formats minor units as a currency string", () => {
    expect(formatMinor(12550, "CAD")).toMatch(/125\.50/);
    expect(formatMinor(0, "CAD")).toMatch(/0\.00/);
  });
});
