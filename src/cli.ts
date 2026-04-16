import { defineCommand, runMain } from "citty";
import {
  listProjects,
  listAllProjects,
  listErrors,
  showError,
  listEvents,
  showEvent,
  listUserOrganizations,
  fetchNextPage,
  BugsnagApiError,
  type BugsnagEvent,
} from "./api.js";
import { parseFilters } from "./filters.js";
import { installSkill } from "./install-skill.js";
import { writeFileSync } from "node:fs";

function getToken(args: { token?: string }): string {
  const token = args.token || process.env.BUGSNAG_AUTH_TOKEN;
  if (!token) {
    console.error("Error: BUGSNAG_AUTH_TOKEN environment variable or --token argument is required.");
    process.exit(1);
  }
  return token;
}

async function getOrgId(args: { orgId?: string; token?: string }): Promise<string> {
  const orgId = args.orgId || process.env.BUGSNAG_ORG_ID;
  if (orgId) return orgId;

  const token = getToken(args);
  const orgs = await listUserOrganizations({ token });
  if (orgs.length === 0) {
    console.error("Error: No organizations found for this token.");
    process.exit(1);
  }
  return orgs[0].id;
}

function outputJson(data: unknown, outputPath?: string): void {
  const json = JSON.stringify(data, null, 2);
  if (outputPath) {
    writeFileSync(outputPath, json + "\n");
    process.stderr.write(`Written to ${outputPath}\n`);
  } else {
    console.log(json);
  }
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
    query: { type: "string", description: "Filter projects by name (case-insensitive substring match)" },
    output: { type: "string", alias: "o", description: "Output file path (default: stdout)" },
  },
  async run({ args }) {
    const token = getToken(args);
    const orgId = await getOrgId(args);
    if (args.query) {
      const all = await listAllProjects(orgId, { token });
      const q = args.query.toLowerCase();
      const filtered = all.filter((p) => p.name.toLowerCase().includes(q));
      outputJson({ data: filtered, pagination: { next: null } }, args.output);
    } else {
      const result = await listProjects(orgId, { token }, { perPage: args.perPage });
      outputJson(result, args.output);
    }
  },
});

const projectsGetId = defineCommand({
  meta: { name: "get-id", description: "Get project ID by exact name" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    orgId: { type: "string", description: "Organization ID" },
    name: { type: "positional", description: "Project name (exact match)", required: true },
  },
  async run({ args }) {
    const token = getToken(args);
    const orgId = await getOrgId(args);
    const all = await listAllProjects(orgId, { token });
    const project = all.find((p) => p.name === args.name);
    if (!project) {
      console.error(`Error: Project "${args.name}" not found.`);
      process.exit(1);
    }
    console.log(project.id);
  },
});

const projectsCommand = defineCommand({
  meta: { name: "projects", description: "Manage projects" },
  subCommands: { list: projectsList, "get-id": projectsGetId },
});

const errorsList = defineCommand({
  meta: { name: "list", description: "List errors in a project" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    perPage: { type: "string", description: "Number of results per page" },
    filter: { type: "string", description: "Filter in key=value format (repeatable)" },
    sort: { type: "string", description: "Sort field (e.g. last_seen, first_seen, events, users)" },
    direction: { type: "string", description: "Sort direction (asc or desc)" },
    next: { type: "string", description: "Next page URL from previous response" },
    output: { type: "string", alias: "o", description: "Output file path (default: stdout)" },
  },
  async run({ args }) {
    const token = getToken(args);
    if (args.next) {
      const result = await fetchNextPage(args.next, { token });
      outputJson(result, args.output);
      return;
    }
    const projectId = getProjectId(args);
    const filterStrings = collectArgs("--filter");
    const filters = filterStrings.length > 0 ? parseFilters(filterStrings) : undefined;
    const result = await listErrors(
      projectId,
      { token },
      { perPage: args.perPage, filters, sort: args.sort, direction: args.direction },
    );
    outputJson(result, args.output);
  },
});

const errorsShow = defineCommand({
  meta: { name: "show", description: "Show details of a specific error" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    errorId: { type: "positional", description: "Error ID", required: true },
    output: { type: "string", alias: "o", description: "Output file path (default: stdout)" },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const result = await showError(projectId, args.errorId, { token });
    outputJson(result, args.output);
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
    filter: { type: "string", description: "Filter in key=value format (repeatable)" },
    next: { type: "string", description: "Next page URL from previous response" },
    output: { type: "string", alias: "o", description: "Output file path (default: stdout)" },
  },
  async run({ args }) {
    const token = getToken(args);
    if (args.next) {
      const result = await fetchNextPage(args.next, { token });
      outputJson(result, args.output);
      return;
    }
    const projectId = getProjectId(args);
    const filterStrings = collectArgs("--filter");
    const filters = filterStrings.length > 0 ? parseFilters(filterStrings) : undefined;
    const result = await listEvents(
      projectId,
      { token },
      { errorId: args.errorId, perPage: args.perPage, filters },
    );
    outputJson(result, args.output);
  },
});

const eventsShow = defineCommand({
  meta: { name: "show", description: "Show details of a specific event" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    eventId: { type: "positional", description: "Event ID", required: true },
    output: { type: "string", alias: "o", description: "Output file path (default: stdout)" },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const result = await showEvent(projectId, args.eventId, { token });
    outputJson(result, args.output);
  },
});

const eventsFetch = defineCommand({
  meta: { name: "fetch", description: "Fetch detailed event data for an error" },
  args: {
    token: { type: "string", description: "Bugsnag Personal Auth Token" },
    projectId: { type: "string", description: "Project ID" },
    errorId: { type: "positional", description: "Error ID", required: true },
    limit: { type: "string", description: "Max number of events to fetch (default: all)" },
    filter: { type: "string", description: "Filter in key=value format (repeatable)" },
    output: { type: "string", alias: "o", description: "Output file path (default: stdout)" },
  },
  async run({ args }) {
    const token = getToken(args);
    const projectId = getProjectId(args);
    const maxEvents = args.limit ? Number.parseInt(args.limit, 10) : Infinity;
    const filterStrings = collectArgs("--filter");
    const filters = filterStrings.length > 0 ? parseFilters(filterStrings) : undefined;

    process.stderr.write(`Fetching event details for error ${args.errorId}...\n`);

    // Collect event IDs via events list with pagination
    const eventIds: string[] = [];
    let listResult = await listEvents(projectId, { token }, { errorId: args.errorId, perPage: "30", filters });
    for (const e of listResult.data) {
      eventIds.push(e.id);
      if (eventIds.length >= maxEvents) break;
    }
    while (listResult.pagination.next && eventIds.length < maxEvents) {
      listResult = await fetchNextPage(listResult.pagination.next, { token });
      for (const e of listResult.data) {
        eventIds.push(e.id);
        if (eventIds.length >= maxEvents) break;
      }
    }

    process.stderr.write(`Found ${eventIds.length} events. Fetching details...\n`);

    // Fetch each event detail
    const events: BugsnagEvent[] = [];
    for (let i = 0; i < eventIds.length; i++) {
      const result = await showEvent(projectId, eventIds[i], { token });
      events.push(result.data);
      process.stderr.write(`  ${i + 1}/${eventIds.length}\n`);
    }

    outputJson({ data: events, total: events.length }, args.output);
  },
});

const eventsCommand = defineCommand({
  meta: { name: "events", description: "Manage events" },
  subCommands: { list: eventsList, show: eventsShow, fetch: eventsFetch },
});

const installSkillCommand = defineCommand({
  meta: { name: "install-skill", description: "Install Claude Code skill to a project" },
  args: {
    dir: {
      type: "positional",
      description: "Target project directory (default: current directory)",
      required: false,
    },
  },
  run({ args }) {
    installSkill(args.dir || process.cwd());
  },
});

const main = defineCommand({
  meta: {
    name: "sg-bugsnag",
    description: "CLI tool for Bugsnag Data Access API",
    version: "0.1.0",
  },
  subCommands: {
    projects: projectsCommand,
    errors: errorsCommand,
    events: eventsCommand,
    "install-skill": installSkillCommand,
  },
});

function collectArgs(flag: string): string[] {
  const values: string[] = [];
  const args = process.argv;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      values.push(args[i + 1]);
      i++;
    } else if (args[i].startsWith(`${flag}=`)) {
      values.push(args[i].slice(flag.length + 1));
    }
  }
  return values;
}

runMain(main).catch((err: unknown) => {
  if (err instanceof BugsnagApiError) {
    console.error(err.message);
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
});
