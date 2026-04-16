import { defineCommand, runMain } from "citty";
import {
  listProjects,
  listAllProjects,
  listErrors,
  showError,
  listEvents,
  showEvent,
  listUserOrganizations,
  BugsnagApiError,
} from "./api.js";
import { parseFilters } from "./filters.js";
import { installSkill } from "./install-skill.js";

function getToken(args: { token?: string }): string {
  const token = args.token || process.env.BUGSNAG_TOKEN;
  if (!token) {
    console.error("Error: BUGSNAG_TOKEN environment variable or --token argument is required.");
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
  },
  async run({ args }) {
    const token = getToken(args);
    const orgId = await getOrgId(args);
    if (args.query) {
      const all = await listAllProjects(orgId, { token });
      const q = args.query.toLowerCase();
      const filtered = all.filter((p) => p.name.toLowerCase().includes(q));
      console.log(JSON.stringify({ data: filtered, pagination: { next: null } }, null, 2));
    } else {
      const result = await listProjects(orgId, { token }, { perPage: args.perPage });
      console.log(JSON.stringify(result, null, 2));
    }
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
    const filterStrings = collectArgs("--filter");
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
    const filterStrings = collectArgs("--filter");
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
