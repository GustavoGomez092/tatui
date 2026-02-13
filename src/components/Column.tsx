import React from "react";
import { Box, Text } from "ink";
import { type TaskWithProject } from "../db/tasks.js";
import { TaskCard } from "./TaskCard.js";

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

export function Column({
  title,
  tasks,
  isActive,
  selectedIndex,
  color,
}: ColumnProps) {
  const icon = STATUS_ICONS[title] ?? "○";

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
        tasks.map((task, index) => (
          <Box key={task.id} marginBottom={index < tasks.length - 1 ? 1 : 0}>
            <TaskCard
              task={task}
              isSelected={isActive && index === selectedIndex}
            />
          </Box>
        ))
      )}
    </Box>
  );
}
