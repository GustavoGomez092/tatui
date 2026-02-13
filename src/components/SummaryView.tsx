import React from "react";
import { Box, Text } from "ink";
import { Alert } from "@inkjs/ui";
import { Table } from "./Table.js";
import { type TaskWithProject } from "../db/tasks.js";
import { type TaskStatus } from "../db/schema.js";
import { formatDuration } from "../utils/week.js";

interface SummaryViewProps {
  tasks: TaskWithProject[];
  weekId: string;
  firstVisibleDay?: number;
  viewportHeight?: number;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const STATUS_LABELS: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "TODO", color: "blue" },
  "in-progress": { label: "IN PROG", color: "yellow" },
  done: { label: "DONE", color: "green" },
  archived: { label: "ARCHVD", color: "gray" },
};

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

function groupByDay(tasks: TaskWithProject[]): Map<number, TaskWithProject[]> {
  const groups = new Map<number, TaskWithProject[]>();
  for (const task of tasks) {
    const day = getDayOfWeek(task.createdAt);
    const list = groups.get(day) ?? [];
    list.push(task);
    groups.set(day, list);
  }
  return groups;
}

type TableRow = {
  [key: string]: string;
  Project: string;
  Title: string;
  Description: string;
  Time: string;
  Status: string;
};

const TABLE_COLUMNS: (keyof TableRow)[] = ["Project", "Title", "Description", "Time", "Status"];

const MAX_COLUMN_WIDTHS: Partial<Record<keyof TableRow, number>> = {
  Project: 12,
  Title: 20,
  Description: 40,
  Time: 6,
  Status: 8,
};

function buildTableData(dayTasks: TaskWithProject[]): TableRow[] {
  return dayTasks.map((task) => {
    const statusInfo = STATUS_LABELS[task.status];
    return {
      Project: task.projectName,
      Title: task.title,
      Description: task.description || "—",
      Time: task.durationMinutes ? formatDuration(task.durationMinutes) : "—",
      Status: statusInfo.label,
    };
  });
}

// Map status labels back to colors for cell rendering
const STATUS_COLOR_BY_LABEL: Record<string, string> = {};
for (const [, info] of Object.entries(STATUS_LABELS)) {
  STATUS_COLOR_BY_LABEL[info.label] = info.color;
}

/** Get the ordered list of active day groups (days that have tasks). */
export function getActiveDayCount(tasks: TaskWithProject[]): number {
  const days = new Set<number>();
  for (const task of tasks) {
    days.add(getDayOfWeek(task.createdAt));
  }
  return days.size;
}

export function SummaryView({ tasks, weekId, firstVisibleDay = 0, viewportHeight }: SummaryViewProps) {
  const byDay = groupByDay(tasks);
  const totalMinutes = tasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const doneMinutes = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  // Build ordered list of active day groups
  const dayGroups: { dayName: string; dayIdx: number; dayTasks: TaskWithProject[] }[] = [];
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayTasks = byDay.get(i);
    if (dayTasks && dayTasks.length > 0) {
      dayGroups.push({ dayName: DAY_NAMES[i], dayIdx: i, dayTasks });
    }
  }

  // Slice from firstVisibleDay onwards
  const visibleGroups = dayGroups.slice(firstVisibleDay);
  const hasAbove = firstVisibleDay > 0;

  const inner = (
    <Box flexDirection="column" flexShrink={0}>
      {/* Summary header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold>
          Week Summary — {weekId}
        </Text>
        <Text>
          <Text color="green">{doneCount}</Text>
          <Text dimColor>/{tasks.length} tasks</Text>
          {totalMinutes > 0 ? (
            <Text dimColor>
              {"  "}
              {formatDuration(doneMinutes)}/{formatDuration(totalMinutes)}
            </Text>
          ) : null}
          {dayGroups.length > 1 ? (
            <Text dimColor>
              {"  "}day {firstVisibleDay + 1}/{dayGroups.length}
              {hasAbove ? " ↑" : ""}
            </Text>
          ) : null}
        </Text>
      </Box>

      {/* Visible day groups */}
      {visibleGroups.map(({ dayName, dayIdx, dayTasks }) => {
        const dayMinutes = dayTasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
        const tableData = buildTableData(dayTasks);

        return (
          <Box key={dayIdx} flexDirection="column" marginBottom={1}>
            {/* Day header */}
            <Box>
              <Text bold color="cyan">{dayName}</Text>
              {dayMinutes > 0 ? (
                <Text dimColor> ({formatDuration(dayMinutes)})</Text>
              ) : null}
            </Box>

            {/* Task table */}
            <Table
              data={tableData}
              columns={TABLE_COLUMNS}
              padding={1}
              maxColumnWidths={MAX_COLUMN_WIDTHS}
              cell={({ children, columnKey }) => {
                if (columnKey === "Status") {
                  const trimmed = String(children).trim();
                  const color = STATUS_COLOR_BY_LABEL[trimmed] ?? "white";
                  return <Text color={color}>{children}</Text>;
                }
                if (columnKey === "Description" || columnKey === "Time") {
                  return <Text dimColor>{children}</Text>;
                }
                return <Text>{children}</Text>;
              }}
            />
          </Box>
        );
      })}

      {tasks.length === 0 ? (
        <Alert variant="info" title="No tasks this week">
          Press Esc to go back to the board, or 'n' to add your first task.
        </Alert>
      ) : null}
    </Box>
  );

  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1} height={viewportHeight} overflow="hidden">
      {inner}
    </Box>
  );
}
