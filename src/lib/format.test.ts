import { describe, expect, it } from "vitest";
import { formatAmount, formatHours, formatMinutes, formatNumber, formatServings } from "./format";

describe("format helpers", () => {
  it("formats numbers with common fractions", () => {
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(0.5)).toBe("½");
    expect(formatNumber(1.5)).toBe("1½");
    expect(formatNumber(0.25)).toBe("¼");
    expect(formatNumber(0.33)).toBe("⅓");
    expect(formatNumber(1.2)).toBe("1.2");
  });

  it("formats amounts with Arabic units and Western digits", () => {
    expect(formatAmount({ amount: 500, unit: "g" })).toBe("500 غ");
    expect(formatAmount({ amount: 2, unit: "tbsp" })).toBe("2 ملعقة كبيرة");
    expect(formatAmount({ amount: 3, unit: "piece" })).toBe("3");
    expect(formatAmount({ unit: "to-taste" })).toBe("حسب الرغبة");
    expect(formatAmount({})).toBe("");
    expect(formatAmount({ amount: 4 })).toBe("4");
  });

  it("formats durations", () => {
    expect(formatMinutes(0)).toBe("بلا طبخ");
    expect(formatMinutes(45)).toBe("45 د");
    expect(formatMinutes(60)).toBe("ساعة");
    expect(formatMinutes(75)).toBe("1 س 15 د");
    expect(formatMinutes(120)).toBe("2 س");
    expect(formatHours(1)).toBe("ساعة");
    expect(formatHours(2)).toBe("ساعتين");
    expect(formatHours(8)).toBe("8 ساعات");
    expect(formatHours(12)).toBe("12 ساعة");
  });

  it("formats servings", () => {
    expect(formatServings(1)).toBe("شخص");
    expect(formatServings(2)).toBe("شخصين");
    expect(formatServings(4)).toBe("4 أشخاص");
    expect(formatServings(12)).toBe("12 شخصاً");
  });
});
