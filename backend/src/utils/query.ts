// Helpers for safely turning URL query strings into database queries.

// Query values can arrive as arrays (?a=1&a=2); we only ever want one string.
export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 200) : undefined;
  }
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  const str = asString(value);
  if (str === undefined) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

// Make user text safe to use inside a regular expression, so a search for
// "a.b" or "(((" is treated as plain text and cannot slow the database down.
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_PAGE_SIZE = 10000;

export function parsePagination(query: Record<string, unknown>, defaultLimit = 10) {
  const page = Math.max(1, Math.floor(asNumber(query.page) ?? 1));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(asNumber(query.limit) ?? defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}

// Only allow sorting by known fields; anything else falls back to the default.
export function parseSort(query: Record<string, unknown>, allowedFields: string[], defaultField = 'date') {
  const requested = asString(query.sortBy);
  const field = requested && allowedFields.includes(requested) ? requested : defaultField;
  const direction: 1 | -1 = asString(query.sortOrder) === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [field]: direction };
  if (field !== '_id') sort._id = -1; // stable order for rows with equal values
  return sort;
}
