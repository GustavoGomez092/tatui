import { describe, it, expect } from "vitest";
import { parseShorthand, parseDuration } from "../parser.js";

describe("parseDuration", () => {
  it("should parse minutes", () => {
    expect(parseDuration("15m")).toBe(15);
    expect(parseDuration("30m")).toBe(30);
  });

  it("should parse hours", () => {
    expect(parseDuration("1h")).toBe(60);
    expect(parseDuration("1.5h")).toBe(90);
  });

  it("should parse days", () => {
    expect(parseDuration("1d")).toBe(480);
    expect(parseDuration("0.5d")).toBe(240);
  });

  it("should return undefined for invalid formats", () => {
    expect(parseDuration("50k")).toBeUndefined();
    expect(parseDuration("abc")).toBeUndefined();
    expect(parseDuration("")).toBeUndefined();
  });
});

describe("parseShorthand", () => {
  it("should parse 2-segment shorthand", () => {
    const result = parseShorthand("Proj::Title");
    expect(result).toEqual({ project: "Proj", title: "Title" });
  });

  it("should parse 3-segment with description", () => {
    const result = parseShorthand("Proj::Title::some desc");
    expect(result?.description).toBe("some desc");
    expect(result?.warnings).toBeUndefined();
  });

  it("should parse 3-segment with valid duration", () => {
    const result = parseShorthand("Proj::Title::1.5h");
    expect(result?.durationMinutes).toBe(90);
    expect(result?.warnings).toBeUndefined();
  });

  it("should warn on invalid 3-segment duration-like string", () => {
    const result = parseShorthand("Proj::Title::50k");
    expect(result?.durationMinutes).toBeUndefined();
    expect(result?.description).toBeUndefined();
    expect(result?.warnings).toHaveLength(1);
    expect(result?.warnings?.[0]).toContain("50k");
  });

  it("should treat non-numeric 3rd segment as description", () => {
    const result = parseShorthand("Proj::Title::some desc");
    expect(result?.description).toBe("some desc");
    expect(result?.warnings).toBeUndefined();
  });

  it("should parse 4-segment with valid duration", () => {
    const result = parseShorthand("Proj::Title::Desc::2h");
    expect(result?.description).toBe("Desc");
    expect(result?.durationMinutes).toBe(120);
    expect(result?.warnings).toBeUndefined();
  });

  it("should warn on invalid 4-segment duration", () => {
    const result = parseShorthand("Proj::Title::Desc::50k");
    expect(result?.durationMinutes).toBeUndefined();
    expect(result?.description).toBe("Desc");
    expect(result?.warnings).toHaveLength(1);
    expect(result?.warnings?.[0]).toContain("50k");
  });
});
