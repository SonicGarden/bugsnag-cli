import type { Filters } from "./api.js";

/**
 * Parse filter strings in the format "key=value" into Filters object.
 * The filter type is determined automatically: "co" for "search", "eq" for everything else.
 * Multiple filters with the same key are grouped together.
 *
 * Example: ["event.class=MyError", "search=timeout"]
 * Result: { "event.class": [{ type: "eq", value: "MyError" }], "search": [{ type: "co", value: "timeout" }] }
 */
export function parseFilters(filterStrings: string[]): Filters {
  const filters: Filters = {};

  for (const str of filterStrings) {
    const eqIndex = str.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(`Invalid filter format: "${str}". Expected "key=value".`);
    }

    const key = str.slice(0, eqIndex);
    const value = str.slice(eqIndex + 1);

    if (!key) {
      throw new Error(`Invalid filter format: "${str}". Key must not be empty.`);
    }

    const type = key === "search" ? "co" : "eq";

    if (!filters[key]) {
      filters[key] = [];
    }
    filters[key].push({ type, value });
  }

  return filters;
}
