import { defineCommand, runMain } from "citty";
import {
  listProjects,
  listErrors,
  showError,
  listEvents,
  showEvent,
  BugsnagApiError,
} from "./api.js";
import { parseFilters } from "./filters.js";

function getToken(args: { token?: string }): string {
  const token = args.token || process.env.BUGSNAG_TOKEN;
  if (!token) {
    console.error("Error: BUGSNAG_TOKEN environment variable or --token argument is required.");
    process.exit(1);
  }
  return token;
}

function getOrgId(args: { orgId?: string }): string {
  const orgId = args.orgId || process.env.BUGSNAG_ORG_ID;
  if (!orgId) {
    console.error("Error: BUGSNAG_ORG_ID environment variable or --org-id argument is required.");
    process.exit(1);
  }
  return orgId;
}

function getProjectId(args: { projectId?: string }): string {
  const projectId = args.projectId || process.env.BUGSNAG_PROJECT_ID;
  if (!projectId) {
    console.error(
      "Error: BUGSNAG_PROJECT_ID environment variable or --project-id argument is required.",
    );
    process.exit(1);
  }
  return projectId;
}

const projectsList = defineCommand({
  meta: { name: "list", description: "List projects in an organization" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    orgId: { type: "string", description: "Organization ID" },
    perPage: { type: "string", description: "Number of results per page" },
  },
  async run({ args }) {
    const token = getToken(args);
    const orgId = getOrgId(args);
    const result = await listProjects(orgId, { token }, { perPage: args.perPage });
    console.log(JSON.stringify(result, null, 2));
  },
});

const projectsCommand = defineCommand({
  meta: { name: "projects", description: "Manage projects" },
  subCommands: { list: projectsList },
});

const errorsList = defineCommand({
  meta: { name: "list", description: "List errors in a project" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    perPage: { type: "string", description: "Number of results per page" },
    filter: { type: "string", description: "Filter in key=type:value format (repeatable)" },
    sort: { type: "string", description: "Sort field (e.g. last_seen, first_seen, events, users)" },
    direction: { type: "string", description: "Sort direction (asc or desc)" },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const filterStrings = toArray(args.filter);
    const filters = filterStrings.length > 0 ? parseFilters(filterStrings) : undefined;
    const result = await listErrors(
      projectId,
      { token },
      { perPage: args.perPage, filters, sort: args.sort, direction: args.direction },
    );
    console.log(JSON.stringify(result, null, 2));
  },
});

const errorsShow = defineCommand({
  meta: { name: "show", description: "Show details of a specific error" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    errorId: { type: "positional", description: "Error ID", required: true },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const result = await showError(projectId, args.errorId, { token });
    console.log(JSON.stringify(result, null, 2));
  },
});

const errorsCommand = defineCommand({
  meta: { name: "errors", description: "Manage errors" },
  subCommands: { list: errorsList, show: errorsShow },
});

const eventsList = defineCommand({
  meta: { name: "list", description: "List events" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    errorId: { type: "string", description: "Error ID (to list events for a specific error)" },
    perPage: { type: "string", description: "Number of results per page" },
    filter: { type: "string", description: "Filter in key=type:value format (repeatable)" },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const filterStrings = toArray(args.filter);
    const filters = filterStrings.length > 0 ? parseFilters(filterStrings) : undefined;
    const result = await listEvents(
      projectId,
      { token },
      { errorId: args.errorId, perPage: args.perPage, filters },
    );
    console.log(JSON.stringify(result, null, 2));
  },
});

const eventsShow = defineCommand({
  meta: { name: "show", description: "Show details of a specific event" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    eventId: { type: "positional", description: "Event ID", required: true },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const result = await showEvent(projectId, args.eventId, { token });
    console.log(JSON.stringify(result, null, 2));
  },
});

const eventsCommand = defineCommand({
  meta: { name: "events", description: "Manage events" },
  subCommands: { list: eventsList, show: eventsShow },
});

const main = defineCommand({
  meta: {
    name: "bugsnag-cli",
    description: "CLI tool for Bugsnag Data Access API",
    version: "0.1.0",
  },
  subCommands: {
    projects: projectsCommand,
    errors: errorsCommand,
    events: eventsCommand,
  },
});

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

runMain(main).catch((err: unknown) => {
  if (err instanceof BugsnagApiError) {
    console.error(err.message);
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
});
