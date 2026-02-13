import React from "react";
import { Box, Text } from "ink";
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
  "in-progress": { label: "IN PROGRESS", color: "yellow" },
  done: { label: "DONE", color: "green" },
  archived: { label: "ARCHIVED", color: "gray" },
};

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  // JS getDay: 0=Sun, 1=Mon... convert to 0=Mon, 6=Sun
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
        <Box width={12}><Text bold dimColor>Project</Text></Box>
        <Box flexGrow={1}><Text bold dimColor>Title</Text></Box>
        <Box width={8}><Text bold dimColor>Time</Text></Box>
        <Box width={14}><Text bold dimColor>Status</Text></Box>
      </Box>
      <Box>
        <Text dimColor>{"─".repeat(60)}</Text>
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

            {/* Task rows */}
            {dayTasks.map((task) => {
              const statusInfo = STATUS_LABELS[task.status];
              return (
                <Box key={task.id}>
                  <Box width={12}>
                    <Text color={task.projectColor}>
                      {task.projectName.slice(0, 10)}
                    </Text>
                  </Box>
                  <Box flexGrow={1}>
                    <Text wrap="truncate">{task.title}</Text>
                  </Box>
                  <Box width={8}>
                    <Text dimColor>
                      {task.durationMinutes ? formatDuration(task.durationMinutes) : "—"}
                    </Text>
                  </Box>
                  <Box width={14}>
                    <Text color={statusInfo.color}>{statusInfo.label}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        );
      })}

      {tasks.length === 0 ? (
        <Text dimColor italic>No tasks this week. Press 's' to go back, 'n' to add tasks.</Text>
      ) : null}
    </Box>
  );
}
