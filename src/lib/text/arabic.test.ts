import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeArabic } from "./arabic";

describe("normalizeArabic", () => {
  it("unifies alef variants", () => {
    expect(normalizeArabic("أرز")).toBe("ارز");
    expect(normalizeArabic("إكليل")).toBe("اكليل");
    expect(normalizeArabic("آيس")).toBe("ايس");
  });

  it("maps taa marbuta and alef maqsura", () => {
    expect(normalizeArabic("ملوخية")).toBe("ملوخيه");
    expect(normalizeArabic("مصفى")).toBe("مصفي");
  });

  it("removes diacritics and tatweel", () => {
    expect(normalizeArabic("مَلّيقة")).toBe("مليقه");
    expect(normalizeArabic("كـــبة")).toBe("كبه");
  });

  it("strips the definite article", () => {
    expect(normalizeArabic("البصل")).toBe("بصل");
    expect(normalizeArabic("رب البندورة")).toBe("رب بندوره");
    expect(normalizeArabic("بالزيت")).toBe("زيت");
  });

  it("keeps short words that merely start with ال", () => {
    expect(normalizeArabic("الو")).toBe("الو");
  });

  it("drops the standalone hamza so spelling variants match", () => {
    expect(normalizeArabic("فاصولياء")).toBe(normalizeArabic("فاصوليا"));
  });

  it("converts Arabic-Indic digits and lowercases Latin text", () => {
    expect(normalizeArabic("٧ بهارات")).toBe("7 بهارات");
    expect(normalizeArabic("Pasta")).toBe("pasta");
  });

  it("collapses punctuation and whitespace", () => {
    expect(normalizeArabic("  لحم،   مفروم! ")).toBe("لحم مفروم");
  });
});

describe("matchesQuery", () => {
  it("matches regardless of spelling variants", () => {
    expect(matchesQuery("لحمة مفرومة", "لحمه")).toBe(true);
    expect(matchesQuery("أرز بالشعيرية", "ارز شعيريه")).toBe(true);
  });

  it("requires every query word", () => {
    expect(matchesQuery("معكرونة بولونيز", "معكرونة فرن")).toBe(false);
  });

  it("treats an empty query as a match", () => {
    expect(matchesQuery("أي شيء", "   ")).toBe(true);
  });
});
