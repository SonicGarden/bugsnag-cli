const BASE_URL = "https://api.bugsnag.com";

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    next: string | null;
  };
}

export interface ApiOptions {
  token: string;
}

export class BugsnagApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "BugsnagApiError";
  }
}

function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function apiRequest<T>(
  path: string,
  options: ApiOptions,
  params?: Record<string, string>,
): Promise<PaginatedResponse<T>> {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `token ${options.token}`,
      "X-Version": "2",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new BugsnagApiError(response.status, `API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as T;
  const next = parseLinkHeader(response.headers.get("link"));

  return { data, pagination: { next } };
}

export interface FilterValue {
  type: string;
  value: string;
}

export type Filters = Record<string, FilterValue[]>;

function buildFilterParams(filters: Filters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, values] of Object.entries(filters)) {
    for (let i = 0; i < values.length; i++) {
      params[`filters[${key}][${i}][type]`] = values[i].type;
      params[`filters[${key}][${i}][value]`] = values[i].value;
    }
  }
  return params;
}

// Projects

export interface Project {
  id: string;
  name: string;
  slug: string;
  api_key: string;
  type: string;
  is_full_view: boolean;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  errors_url: string;
  events_url: string;
  [key: string]: unknown;
}

export function listProjects(
  orgId: string,
  options: ApiOptions,
  params?: { perPage?: string },
): Promise<PaginatedResponse<Project[]>> {
  const queryParams: Record<string, string> = {};
  if (params?.perPage) queryParams["per_page"] = params.perPage;
  return apiRequest<Project[]>(`/organizations/${orgId}/projects`, options, queryParams);
}

// Errors

export interface BugsnagError {
  id: string;
  error_class: string;
  message: string;
  context: string;
  severity: string;
  status: string;
  events: number;
  first_seen: string;
  last_seen: string;
  url: string;
  [key: string]: unknown;
}

export function listErrors(
  projectId: string,
  options: ApiOptions,
  params?: { perPage?: string; filters?: Filters; sort?: string; direction?: string },
): Promise<PaginatedResponse<BugsnagError[]>> {
  const queryParams: Record<string, string> = {};
  if (params?.perPage) queryParams["per_page"] = params.perPage;
  if (params?.sort) queryParams["sort"] = params.sort;
  if (params?.direction) queryParams["direction"] = params.direction;
  if (params?.filters) Object.assign(queryParams, buildFilterParams(params.filters));
  return apiRequest<BugsnagError[]>(`/projects/${projectId}/errors`, options, queryParams);
}

export function showError(
  projectId: string,
  errorId: string,
  options: ApiOptions,
): Promise<PaginatedResponse<BugsnagError>> {
  return apiRequest<BugsnagError>(`/projects/${projectId}/errors/${errorId}`, options);
}

// Events

export interface BugsnagEvent {
  id: string;
  error_class: string;
  message: string;
  context: string;
  severity: string;
  received_at: string;
  url: string;
  exceptions: unknown[];
  metadata: Record<string, unknown>;
  request: Record<string, unknown>;
  user: Record<string, unknown>;
  app: Record<string, unknown>;
  device: Record<string, unknown>;
  [key: string]: unknown;
}

export function listEvents(
  projectId: string,
  options: ApiOptions,
  params?: { errorId?: string; perPage?: string; filters?: Filters },
): Promise<PaginatedResponse<BugsnagEvent[]>> {
  const queryParams: Record<string, string> = {};
  if (params?.perPage) queryParams["per_page"] = params.perPage;
  if (params?.filters) Object.assign(queryParams, buildFilterParams(params.filters));

  const basePath = params?.errorId
    ? `/projects/${projectId}/errors/${params.errorId}/events`
    : `/projects/${projectId}/events`;

  return apiRequest<BugsnagEvent[]>(basePath, options, queryParams);
}

export function showEvent(
  projectId: string,
  eventId: string,
  options: ApiOptions,
): Promise<PaginatedResponse<BugsnagEvent>> {
  return apiRequest<BugsnagEvent>(`/projects/${projectId}/events/${eventId}`, options);
}
