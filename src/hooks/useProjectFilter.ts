import { useState, useMemo, useCallback } from "react";
import { type TaskWithProject } from "../db/tasks.js";
import { type TaskStatus } from "../db/schema.js";

export interface UseProjectFilterResult {
  activeFilter: string | null;
  setFilter: (projectName: string | null) => void;
  cycleFilter: (projectNames: string[]) => void;
  filterTasks: (
    tasksByStatus: Record<TaskStatus, TaskWithProject[]>
  ) => Record<TaskStatus, TaskWithProject[]>;
}

export function useProjectFilter(): UseProjectFilterResult {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const setFilter = useCallback((projectName: string | null) => {
    setActiveFilter(projectName);
  }, []);

  const cycleFilter = useCallback(
    (projectNames: string[]) => {
      if (projectNames.length === 0) return;
      if (activeFilter === null) {
        setActiveFilter(projectNames[0]);
      } else {
        const idx = projectNames.indexOf(activeFilter);
        if (idx === -1 || idx === projectNames.length - 1) {
          setActiveFilter(null); // cycle back to "all"
        } else {
          setActiveFilter(projectNames[idx + 1]);
        }
      }
    },
    [activeFilter]
  );

  const filterTasks = useCallback(
    (
      tasksByStatus: Record<TaskStatus, TaskWithProject[]>
    ): Record<TaskStatus, TaskWithProject[]> => {
      if (!activeFilter) return tasksByStatus;

      const filter = (ts: TaskWithProject[]) =>
        ts.filter((t) => t.projectName === activeFilter);

      return {
        todo: filter(tasksByStatus.todo),
        "in-progress": filter(tasksByStatus["in-progress"]),
        done: filter(tasksByStatus.done),
        archived: filter(tasksByStatus.archived),
      };
    },
    [activeFilter]
  );

  return { activeFilter, setFilter, cycleFilter, filterTasks };
}
