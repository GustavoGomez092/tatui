import { useState, useCallback, useMemo } from "react";
import {
  getTasksByWeek,
  getTasksByStatus,
  createTask,
  updateTask,
  changeTaskProject,
  moveTask,
  deleteTask,
  type TaskWithProject,
} from "../db/tasks.js";
import { type TaskStatus } from "../db/schema.js";
import { getWeekId, getDayOfWeek } from "../utils/week.js";
import { type NewTask } from "../db/schema.js";

export interface UseTasksResult {
  tasks: TaskWithProject[];
  tasksByStatus: Record<TaskStatus, TaskWithProject[]>;
  weekId: string;
  addTask: (input: string | (Omit<NewTask, "weekId"> & { project?: string })) => TaskWithProject;
  editTask: (
    id: number,
    data: Partial<Pick<TaskWithProject, "title" | "description" | "status" | "durationMinutes" | "position">>
  ) => void;
  changeProject: (id: number, projectName: string) => TaskWithProject | undefined;
  move: (id: number, status: TaskStatus) => void;
  remove: (id: number) => void;
  refresh: () => void;
}

export function useTasks(weekId: string = getWeekId()): UseTasksResult {
  const [tasks, setTasks] = useState<TaskWithProject[]>(() =>
    getTasksByWeek(weekId)
  );

  const refresh = useCallback(() => {
    setTasks(getTasksByWeek(weekId));
  }, [weekId]);

  const tasksByStatus = useMemo(() => {
    const sortByDay = (a: TaskWithProject, b: TaskWithProject) =>
      getDayOfWeek(a.createdAt) - getDayOfWeek(b.createdAt);
    return {
      todo: tasks.filter((t) => t.status === "todo").sort(sortByDay),
      "in-progress": tasks.filter((t) => t.status === "in-progress").sort(sortByDay),
      done: tasks.filter((t) => t.status === "done").sort(sortByDay),
      archived: tasks.filter((t) => t.status === "archived").sort(sortByDay),
    };
  }, [tasks]);

  const addTask = useCallback(
    (input: string | (Omit<NewTask, "weekId"> & { project?: string })) => {
      const newTask = createTask(input);
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    []
  );

  const editTask = useCallback(
    (
      id: number,
      data: Partial<Pick<TaskWithProject, "title" | "description" | "status" | "durationMinutes" | "position">>
    ) => {
      const updated = updateTask(id, data);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    },
    []
  );

  const changeProject = useCallback((id: number, projectName: string): TaskWithProject | undefined => {
    const updated = changeTaskProject(id, projectName);
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
    return updated;
  }, []);

  const move = useCallback((id: number, status: TaskStatus) => {
    const updated = moveTask(id, status);
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  }, []);

  const remove = useCallback((id: number) => {
    deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tasks, tasksByStatus, weekId, addTask, editTask, changeProject, move, remove, refresh };
}
