import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TOGGL_API_TOKEN;
if (!token) {
  console.error("Missing TOGGL_API_TOKEN in .env");
  process.exit(1);
}

const authHeader = Buffer
  .from(`${token}:api_token`)
  .toString("base64");

const toggl = axios.create({
  baseURL: "https://api.track.toggl.com/api/v9",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Basic ${authHeader}`
  }
});

export interface Workspace {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  workspace_id: number;
  active: boolean;
}

export interface TimeEntry {
  id: number;
  description: string;
  start: string;
  duration: number;
  project_id: number;
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await toggl.get<Workspace[]>("/me/workspaces");
  return response.data;
}

export async function fetchProjects(workspaceId: number): Promise<Project[]> {
  const response = await toggl.get<Project[]>(`/workspaces/${workspaceId}/projects`);
  return response.data;
}

export async function getThinkGISProjectId(workspaceId: number): Promise<number | null> {
  const projects = await fetchProjects(workspaceId);
  const thinkGIS = projects.find(p => p.name.toLowerCase() === "thinkgis");
  if (!thinkGIS) {
    console.warn("ThinkGIS project not found.");
    return null;
  }
  return thinkGIS.id;
}

export async function fetchTimeEntries(
  workspaceId: number,
  startDateIso: string,
  endDateIso: string
): Promise<TimeEntry[]> {
  const resp = await toggl.get<TimeEntry[]>("/me/time_entries", {
    params: {
      start_date: startDateIso,
      end_date: endDateIso
    }
  });
  return resp.data;
}
