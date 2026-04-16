import type { Filters } from "./api.js";

/**
 * Parse filter strings in the format "key=type:value" into Filters object.
 * Multiple filters with the same key are grouped together.
 *
 * Example: ["event.class=eq:MyError", "event.since=eq:2024-01-01"]
 * Result: { "event.class": [{ type: "eq", value: "MyError" }], "event.since": [{ type: "eq", value: "2024-01-01" }] }
 */
export function parseFilters(filterStrings: string[]): Filters {
  const filters: Filters = {};

  for (const str of filterStrings) {
    const eqIndex = str.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(`Invalid filter format: "${str}". Expected "key=type:value".`);
    }

    const key = str.slice(0, eqIndex);
    const rest = str.slice(eqIndex + 1);
    const colonIndex = rest.indexOf(":");
    if (colonIndex === -1) {
      throw new Error(`Invalid filter format: "${str}". Expected "key=type:value".`);
    }

    const type = rest.slice(0, colonIndex);
    const value = rest.slice(colonIndex + 1);

    if (!key || !type) {
      throw new Error(`Invalid filter format: "${str}". Key and type must not be empty.`);
    }

    if (!filters[key]) {
      filters[key] = [];
    }
    filters[key].push({ type, value });
  }

  return filters;
}
