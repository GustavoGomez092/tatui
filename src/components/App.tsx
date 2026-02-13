import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { ThemeProvider, defaultTheme, extendTheme, ConfirmInput, StatusMessage } from "@inkjs/ui";
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

const tatuiTheme = extendTheme(defaultTheme, {
  components: {
    TextInput: {
      styles: {
        value: () => ({ color: "white" }),
      },
    },
    Select: {
      styles: {
        focusIndicator: () => ({ color: "cyan" }),
      },
    },
  },
});

type AppMode = "navigate" | "input" | "summary" | "detail" | "confirm-delete";

export function App() {
  const weekId = getWeekId();
  const { tasks, tasksByStatus, addTask, editTask, changeProject, move, remove, refresh } =
    useTasks(weekId);
  const { projects, refresh: refreshProjects } = useProjects();
  const { activeFilter, cycleFilter, filterTasks } = useProjectFilter();
  const { exit } = useApp();

  const [activeColumn, setActiveColumn] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [mode, setMode] = useState<AppMode>("navigate");
  const [detailTask, setDetailTask] = useState<TaskWithProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithProject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showError = useCallback((msg: string) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setErrorMsg(msg);
    errorTimer.current = setTimeout(() => setErrorMsg(null), 3000);
  }, []);

  const handleNewTask = useCallback(
    (input: string) => {
      try {
        addTask(input);
        refreshProjects();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to create task");
      }
      setMode("navigate");
    },
    [addTask, refreshProjects, showError]
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

      // Delete task (with confirmation)
      if (input === "d" && currentTasks.length > 0) {
        const task = currentTasks[selectedRow];
        if (task) {
          setDeleteTarget(task);
          setMode("confirm-delete");
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

  const handleDetailClose = useCallback(() => {
    setDetailTask(null);
    setMode("navigate");
    refresh();
    refreshProjects();
  }, [refresh, refreshProjects]);

  const handleDetailUpdateField = useCallback(
    (
      id: number,
      data: Partial<Pick<TaskWithProject, "title" | "description" | "durationMinutes">>
    ) => {
      editTask(id, data);
      // Update the detailTask in place so the view reflects changes
      setDetailTask((prev) =>
        prev && prev.id === id ? { ...prev, ...data } : prev
      );
    },
    [editTask]
  );

  const handleDetailChangeProject = useCallback(
    (id: number, projectName: string) => {
      const updated = changeProject(id, projectName);
      refreshProjects();
      // Stay in detail view with updated project info
      if (updated) {
        setDetailTask(updated);
      }
    },
    [changeProject, refreshProjects]
  );

  return (
    <ThemeProvider theme={tatuiTheme}>
    <Box flexDirection="column" width="100%">
      <Header weekId={weekId} tasks={tasks} activeFilter={activeFilter ?? undefined} />

      {mode === "detail" && detailTask ? (
        <TaskDetail
          task={detailTask}
          projectNames={projectNames}
          onUpdateField={handleDetailUpdateField}
          onChangeProject={handleDetailChangeProject}
          onClose={handleDetailClose}
          isActive={mode === "detail"}
        />
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

      {mode === "confirm-delete" && deleteTarget ? (
        <Box paddingX={1} borderStyle="single" borderColor="red">
          <Text color="red" bold>Delete </Text>
          <Text bold>"{deleteTarget.title}"</Text>
          <Text color="red" bold>? </Text>
          <ConfirmInput
            defaultChoice="cancel"
            onConfirm={() => {
              remove(deleteTarget.id);
              setSelectedRow(Math.max(0, selectedRow - 1));
              setDeleteTarget(null);
              setMode("navigate");
            }}
            onCancel={() => {
              setDeleteTarget(null);
              setMode("navigate");
            }}
          />
        </Box>
      ) : null}

      {errorMsg ? (
        <StatusMessage variant="error">{errorMsg}</StatusMessage>
      ) : null}

      <HelpBar mode={mode} />
    </Box>
    </ThemeProvider>
  );
}
