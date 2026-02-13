import React, { useState, useCallback, useEffect } from "react";
import { Box, useInput, useApp } from "ink";
import { Board, COLUMNS } from "./Board.js";
import { Header } from "./Header.js";
import { HelpBar } from "./HelpBar.js";
import { TaskInput } from "./TaskInput.js";
import { SummaryView } from "./SummaryView.js";
import { TaskDetail } from "./TaskDetail.js";
import { type TaskWithProject } from "../db/tasks.js";
import { useTasks } from "../hooks/useTasks.js";
import { useProjects } from "../hooks/useProjects.js";
import { useProjectFilter } from "../hooks/useProjectFilter.js";
import { getWeekId } from "../utils/week.js";
import { rolloverTasks } from "../db/weeks.js";

type AppMode = "navigate" | "input" | "summary" | "detail";

export function App() {
  const weekId = getWeekId();
  const { tasks, tasksByStatus, addTask, move, remove, refresh } =
    useTasks(weekId);
  const { projects } = useProjects();
  const { activeFilter, cycleFilter, filterTasks } = useProjectFilter();
  const { exit } = useApp();

  const [activeColumn, setActiveColumn] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [mode, setMode] = useState<AppMode>("navigate");
  const [detailTask, setDetailTask] = useState<TaskWithProject | null>(null);

  // Auto-rollover unfinished tasks from previous weeks
  useEffect(() => {
    const rolled = rolloverTasks();
    if (rolled > 0) refresh();
  }, []);

  const filteredTasks = filterTasks(tasksByStatus);
  const currentColumnKey = COLUMNS[activeColumn].key;
  const currentTasks = filteredTasks[currentColumnKey];
  const projectNames = projects.map((p) => p.name);

  const clampRow = useCallback(
    (col: number) => {
      const colKey = COLUMNS[col].key;
      const colTasks = filteredTasks[colKey];
      return Math.max(0, Math.min(selectedRow, colTasks.length - 1));
    },
    [filteredTasks, selectedRow]
  );

  const handleNewTask = useCallback(
    (input: string) => {
      addTask(input);
      setMode("navigate");
    },
    [addTask]
  );

  useInput(
    (input, key) => {
      if (mode !== "navigate") return;

      if (input === "q") {
        exit();
        return;
      }

      // New task
      if (input === "n") {
        setMode("input");
        return;
      }

      // Summary view toggle
      if (input === "s") {
        setMode("summary");
        return;
      }

      // Project filter toggle
      if (input === "p") {
        cycleFilter(projectNames);
        setSelectedRow(0);
        return;
      }

      // Column navigation
      if (key.leftArrow || input === "h") {
        const newCol = Math.max(0, activeColumn - 1);
        setActiveColumn(newCol);
        setSelectedRow(clampRow(newCol));
        return;
      }
      if (key.rightArrow || input === "l") {
        const newCol = Math.min(COLUMNS.length - 1, activeColumn + 1);
        setActiveColumn(newCol);
        setSelectedRow(clampRow(newCol));
        return;
      }

      // Row navigation
      if (key.upArrow || input === "k") {
        setSelectedRow(Math.max(0, selectedRow - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setSelectedRow(Math.min(currentTasks.length - 1, selectedRow + 1));
        return;
      }

      // Open task detail
      if (input === "o" && currentTasks.length > 0) {
        const task = currentTasks[selectedRow];
        if (task) {
          setDetailTask(task);
          setMode("detail");
        }
        return;
      }

      // Advance task
      if (key.return && currentTasks.length > 0) {
        const task = currentTasks[selectedRow];
        if (task) {
          const nextColIdx = Math.min(COLUMNS.length - 1, activeColumn + 1);
          const nextStatus = COLUMNS[nextColIdx].key;
          if (nextStatus !== currentColumnKey) {
            move(task.id, nextStatus);
            setSelectedRow(Math.max(0, selectedRow - 1));
          }
        }
        return;
      }

      // Move task backward
      if (input === "b" && currentTasks.length > 0) {
        const task = currentTasks[selectedRow];
        if (task) {
          const prevColIdx = Math.max(0, activeColumn - 1);
          const prevStatus = COLUMNS[prevColIdx].key;
          if (prevStatus !== currentColumnKey) {
            move(task.id, prevStatus);
            setSelectedRow(Math.max(0, selectedRow - 1));
          }
        }
        return;
      }

      // Delete task
      if (input === "d" && currentTasks.length > 0) {
        const task = currentTasks[selectedRow];
        if (task) {
          remove(task.id);
          setSelectedRow(Math.max(0, selectedRow - 1));
        }
        return;
      }

      // Refresh
      if (input === "r") {
        refresh();
        return;
      }
    },
    { isActive: mode === "navigate" }
  );

  useInput(
    (input, key) => {
      if (input === "s" || input === "q" || key.escape) {
        if (input === "q") {
          exit();
          return;
        }
        setMode("navigate");
      }
    },
    { isActive: mode === "summary" }
  );

  useInput(
    (input, key) => {
      if (key.escape || key.return || input === "o" || input === "q") {
        if (input === "q") {
          exit();
          return;
        }
        setDetailTask(null);
        setMode("navigate");
      }
    },
    { isActive: mode === "detail" }
  );

  return (
    <Box flexDirection="column" width="100%">
      <Header weekId={weekId} tasks={tasks} activeFilter={activeFilter ?? undefined} />

      {mode === "detail" && detailTask ? (
        <TaskDetail task={detailTask} />
      ) : mode === "summary" ? (
        <SummaryView tasks={tasks} weekId={weekId} />
      ) : (
        <Board
          tasksByStatus={filteredTasks}
          activeColumn={activeColumn}
          selectedRow={selectedRow}
        />
      )}

      {mode === "input" ? (
        <TaskInput
          projectNames={projectNames}
          onSubmit={handleNewTask}
          onCancel={() => setMode("navigate")}
          isActive={mode === "input"}
        />
      ) : null}

      <HelpBar mode={mode} />
    </Box>
  );
}
