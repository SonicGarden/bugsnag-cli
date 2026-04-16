import { describe, it, expect } from "vitest";
import { parseFilters } from "../src/filters.js";

describe("parseFilters", () => {
  it("parses a single filter", () => {
    const result = parseFilters(["event.class=eq:MyError"]);
    expect(result).toEqual({
      "event.class": [{ type: "eq", value: "MyError" }],
    });
  });

  it("parses multiple filters with different keys", () => {
    const result = parseFilters(["event.class=eq:MyError", "event.since=eq:2024-01-01"]);
    expect(result).toEqual({
      "event.class": [{ type: "eq", value: "MyError" }],
      "event.since": [{ type: "eq", value: "2024-01-01" }],
    });
  });

  it("groups multiple filters with the same key", () => {
    const result = parseFilters(["event.class=eq:MyError", "event.class=eq:OtherError"]);
    expect(result).toEqual({
      "event.class": [
        { type: "eq", value: "MyError" },
        { type: "eq", value: "OtherError" },
      ],
    });
  });

  it("handles value containing colons", () => {
    const result = parseFilters(["event.since=eq:2024-01-01T10:00:00.000Z"]);
    expect(result).toEqual({
      "event.since": [{ type: "eq", value: "2024-01-01T10:00:00.000Z" }],
    });
  });

  it("handles empty value", () => {
    const result = parseFilters(["event.class=eq:"]);
    expect(result).toEqual({
      "event.class": [{ type: "eq", value: "" }],
    });
  });

  it("returns empty object for empty array", () => {
    const result = parseFilters([]);
    expect(result).toEqual({});
  });

  it("throws on missing equals sign", () => {
    expect(() => parseFilters(["invalid"])).toThrow('Invalid filter format: "invalid"');
  });

  it("throws on missing colon", () => {
    expect(() => parseFilters(["key=nocolon"])).toThrow('Invalid filter format: "key=nocolon"');
  });

  it("throws on empty key", () => {
    expect(() => parseFilters(["=eq:value"])).toThrow("Key and type must not be empty");
  });
});
