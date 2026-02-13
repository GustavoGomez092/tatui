import React from "react";
import { Box, Text } from "ink";
import { Alert, Badge } from "@inkjs/ui";
import { type TaskWithProject } from "../db/tasks.js";
import { type TaskStatus } from "../db/schema.js";
import { formatDuration } from "../utils/week.js";

interface SummaryViewProps {
  tasks: TaskWithProject[];
  weekId: string;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const STATUS_LABELS: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "TODO", color: "blue" },
  "in-progress": { label: "IN PROG", color: "yellow" },
  done: { label: "DONE", color: "green" },
  archived: { label: "ARCHVD", color: "gray" },
};

// Column widths
const COL_PROJECT = 12;
const COL_TITLE = 22;
const COL_DESC = 30;
const COL_TIME = 7;
const COL_STATUS = 8;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str.padEnd(max);
  return str.slice(0, max - 2) + "..";
}

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

const SEPARATOR_WIDTH = COL_PROJECT + COL_TITLE + COL_DESC + COL_TIME + COL_STATUS + 4;

export function SummaryView({ tasks, weekId }: SummaryViewProps) {
  const byDay = groupByDay(tasks);
  const totalMinutes = tasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const doneMinutes = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
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
        </Text>
      </Box>

      {/* Table header */}
      <Box>
        <Box width={COL_PROJECT}><Text bold dimColor>Project</Text></Box>
        <Text> </Text>
        <Box width={COL_TITLE}><Text bold dimColor>Title</Text></Box>
        <Text> </Text>
        <Box width={COL_DESC}><Text bold dimColor>Description</Text></Box>
        <Text> </Text>
        <Box width={COL_TIME}><Text bold dimColor>Time</Text></Box>
        <Text> </Text>
        <Box width={COL_STATUS}><Text bold dimColor>Status</Text></Box>
      </Box>
      <Box>
        <Text dimColor>{"─".repeat(SEPARATOR_WIDTH)}</Text>
      </Box>

      {/* Days */}
      {DAY_NAMES.map((dayName, dayIdx) => {
        const dayTasks = byDay.get(dayIdx);
        if (!dayTasks || dayTasks.length === 0) return null;

        const dayMinutes = dayTasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);

        return (
          <Box key={dayIdx} flexDirection="column" marginBottom={1}>
            {/* Day header */}
            <Box>
              <Text bold color="cyan">{dayName}</Text>
              {dayMinutes > 0 ? (
                <Text dimColor> ({formatDuration(dayMinutes)})</Text>
              ) : null}
            </Box>

            {/* Task rows — all values pre-truncated to fixed widths */}
            {dayTasks.map((task) => {
              const statusInfo = STATUS_LABELS[task.status];
              const project = truncate(task.projectName, COL_PROJECT);
              const title = truncate(task.title, COL_TITLE);
              const desc = truncate(task.description || "—", COL_DESC);
              const time = (task.durationMinutes ? formatDuration(task.durationMinutes) : "—").padEnd(COL_TIME);
              const status = truncate(statusInfo.label, COL_STATUS);

              return (
                <Box key={task.id}>
                  <Box width={COL_PROJECT}>
                    <Text color={task.projectColor}>{project}</Text>
                  </Box>
                  <Text> </Text>
                  <Box width={COL_TITLE}>
                    <Text>{title}</Text>
                  </Box>
                  <Text> </Text>
                  <Box width={COL_DESC}>
                    <Text dimColor>{desc}</Text>
                  </Box>
                  <Text> </Text>
                  <Box width={COL_TIME}>
                    <Text dimColor>{time}</Text>
                  </Box>
                  <Text> </Text>
                  <Box width={COL_STATUS}>
                    <Badge color={statusInfo.color}>{status}</Badge>
                  </Box>
                </Box>
              );
            })}
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
}
