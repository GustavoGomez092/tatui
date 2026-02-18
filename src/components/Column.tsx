import React from "react";
import { Box, Text } from "ink";
import { type TaskWithProject } from "../db/tasks.js";
import { TaskCard } from "./TaskCard.js";
import { getDayOfWeek, DAY_LABELS } from "../utils/week.js";

interface ColumnProps {
  title: string;
  tasks: TaskWithProject[];
  isActive: boolean;
  selectedIndex: number;
  color: string;
}

const STATUS_ICONS: Record<string, string> = {
  "To Do": "○",
  "In Progress": "◐",
  Done: "●",
  Archived: "◌",
};

function DaySeparator({ label }: { label: string }) {
  return (
    <Box justifyContent="center">
      <Text dimColor>{"───── "}{label}{" ─────"}</Text>
    </Box>
  );
}

export function Column({
  title,
  tasks,
  isActive,
  selectedIndex,
  color,
}: ColumnProps) {
  const icon = STATUS_ICONS[title] ?? "○";

  // Build render items: interleave day separators with task cards
  const renderItems: React.ReactNode[] = [];
  if (tasks.length > 0) {
    let lastDay = -1;
    tasks.forEach((task, index) => {
      const day = getDayOfWeek(task.createdAt);
      if (day !== lastDay) {
        renderItems.push(
          <Box key={`sep-${day}`} marginBottom={0}>
            <DaySeparator label={DAY_LABELS[day]} />
          </Box>
        );
        lastDay = day;
      }
      renderItems.push(
        <Box key={task.id} marginBottom={index < tasks.length - 1 ? 1 : 0}>
          <TaskCard
            task={task}
            isSelected={isActive && index === selectedIndex}
          />
        </Box>
      );
    });
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      borderStyle="single"
      borderColor={isActive ? "cyan" : "gray"}
      paddingX={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={isActive ? color : undefined}>
          {icon} {title}
        </Text>
        <Text dimColor>({tasks.length})</Text>
      </Box>

      {tasks.length === 0 ? (
        <Text dimColor italic>
          No tasks
        </Text>
      ) : (
        renderItems
      )}
    </Box>
  );
}
