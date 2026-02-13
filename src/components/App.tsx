import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { ThemeProvider, defaultTheme, extendTheme, ConfirmInput, StatusMessage, Spinner } from "@inkjs/ui";
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
import { getWeekId, formatDuration } from "../utils/week.js";
import { rolloverTasks } from "../db/weeks.js";
import clipboard from "clipboardy";

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { stdout } = useStdout();

  // Viewport height for summary scroll (subtract header ~3, helpbar ~1, messages ~2)
  const viewportHeight = Math.max(5, (stdout?.rows ?? 24) - 6);

  // Estimate total content lines for summary scroll max
  const summaryMaxScroll = useMemo(() => {
    const byDay = new Map<number, number>();
    for (const task of tasks) {
      const d = new Date(task.createdAt);
      const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    // header(2) + per day: header(1) + table(3 + 2*count) + margin(1)
    let total = 2;
    for (const count of byDay.values()) {
      total += 5 + 2 * count;
    }
    return Math.max(0, total - viewportHeight);
  }, [tasks, viewportHeight]);

  // Auto-rollover unfinished tasks from previous weeks
  useEffect(() => {
    const rolled = rolloverTasks();
    if (rolled > 0) refresh();
    setIsLoading(false);
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

  const showSuccess = useCallback((msg: string) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccessMsg(msg);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 2000);
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setErrorMsg(msg);
    errorTimer.current = setTimeout(() => setErrorMsg(null), 3000);
  }, []);

  const handleNewTask = useCallback(
    (input: string) => {
      try {
        const result = addTask(input);
        refreshProjects();
        if (result?.warnings?.length) {
          showError(result.warnings[0]!);
        }
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
        setScrollOffset(0);
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

  const copyToClipboard = useCallback(() => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const statusLabels: Record<string, string> = {
      todo: "TODO", "in-progress": "IN PROGRESS", done: "DONE", archived: "ARCHIVED",
    };
    const getDayOfWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      return day === 0 ? 6 : day - 1;
    };

    const header = "Day\tProject\tTitle\tDescription\tTime\tStatus";
    const rows = tasks.map((task) => {
      const day = dayNames[getDayOfWeek(task.createdAt)] ?? "";
      const time = task.durationMinutes ? formatDuration(task.durationMinutes) : "";
      const status = statusLabels[task.status] ?? task.status;
      const desc = task.description ?? "";
      return `${day}\t${task.projectName}\t${task.title}\t${desc}\t${time}\t${status}`;
    });
    const tsv = [header, ...rows].join("\n");

    clipboard.write(tsv).then(() => {
      showSuccess("Copied to clipboard!");
    }).catch(() => {
      showError("Failed to copy to clipboard");
    });
  }, [tasks, showSuccess, showError]);

  useInput(
    (input, key) => {
      if (input === "c") {
        copyToClipboard();
        return;
      }
      // Scroll down
      if (input === "j" || key.downArrow) {
        setScrollOffset((prev) => Math.min(prev + 1, summaryMaxScroll));
        return;
      }
      // Scroll up
      if (input === "k" || key.upArrow) {
        setScrollOffset((prev) => Math.max(prev - 1, 0));
        return;
      }
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

      {isLoading ? (
        <Spinner label="Loading tasks..." />
      ) : mode === "detail" && detailTask ? (
        <TaskDetail
          task={detailTask}
          projectNames={projectNames}
          onUpdateField={handleDetailUpdateField}
          onChangeProject={handleDetailChangeProject}
          onClose={handleDetailClose}
          isActive={mode === "detail"}
        />
      ) : mode === "summary" ? (
        <SummaryView tasks={tasks} weekId={weekId} scrollOffset={scrollOffset} viewportHeight={viewportHeight} />
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

      {successMsg ? (
        <StatusMessage variant="success">{successMsg}</StatusMessage>
      ) : null}

      <HelpBar mode={mode} />
    </Box>
    </ThemeProvider>
  );
}
