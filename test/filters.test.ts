import { describe, it, expect } from "vitest";
import { parseFilters } from "../src/filters.js";

describe("parseFilters", () => {
  it("parses a single filter with eq type", () => {
    const result = parseFilters(["event.class=MyError"]);
    expect(result).toEqual({
      "event.class": [{ type: "eq", value: "MyError" }],
    });
  });

  it("uses co type for search filter", () => {
    const result = parseFilters(["search=timeout"]);
    expect(result).toEqual({
      search: [{ type: "co", value: "timeout" }],
    });
  });

  it("parses multiple filters with different keys", () => {
    const result = parseFilters(["event.class=MyError", "event.since=2024-01-01"]);
    expect(result).toEqual({
      "event.class": [{ type: "eq", value: "MyError" }],
      "event.since": [{ type: "eq", value: "2024-01-01" }],
    });
  });

  it("groups multiple filters with the same key", () => {
    const result = parseFilters(["event.class=MyError", "event.class=OtherError"]);
    expect(result).toEqual({
      "event.class": [
        { type: "eq", value: "MyError" },
        { type: "eq", value: "OtherError" },
      ],
    });
  });

  it("handles value containing colons", () => {
    const result = parseFilters(["event.since=2024-01-01T10:00:00.000Z"]);
    expect(result).toEqual({
      "event.since": [{ type: "eq", value: "2024-01-01T10:00:00.000Z" }],
    });
  });

  it("handles value containing equals sign", () => {
    const result = parseFilters(["search=key=value"]);
    expect(result).toEqual({
      search: [{ type: "co", value: "key=value" }],
    });
  });

  it("handles empty value", () => {
    const result = parseFilters(["event.class="]);
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

  it("throws on empty key", () => {
    expect(() => parseFilters(["=value"])).toThrow("Key must not be empty");
  });
});
