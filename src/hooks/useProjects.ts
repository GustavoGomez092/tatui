import { useState, useCallback } from "react";
import {
  getAllProjects,
  ensureProject,
  updateProject,
  deleteProject,
} from "../db/projects.js";
import { type Project } from "../db/schema.js";

export interface UseProjectsResult {
  projects: Project[];
  getOrCreate: (name: string) => Project;
  update: (id: number, data: Partial<Pick<Project, "name" | "color">>) => void;
  remove: (id: number) => void;
  refresh: () => void;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>(() => getAllProjects());

  const refresh = useCallback(() => {
    setProjects(getAllProjects());
  }, []);

  const getOrCreate = useCallback((name: string) => {
    const project = ensureProject(name);
    setProjects(getAllProjects());
    return project;
  }, []);

  const update = useCallback(
    (id: number, data: Partial<Pick<Project, "name" | "color">>) => {
      updateProject(id, data);
      setProjects(getAllProjects());
    },
    []
  );

  const remove = useCallback((id: number) => {
    deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { projects, getOrCreate, update, remove, refresh };
}
