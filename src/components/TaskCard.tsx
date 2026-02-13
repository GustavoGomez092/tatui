import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { type TaskWithProject } from "../db/tasks.js";
import { formatDuration } from "../utils/week.js";

interface TaskCardProps {
  task: TaskWithProject;
  isSelected: boolean;
}

export function TaskCard({ task, isSelected }: TaskCardProps) {
  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle={isSelected ? "bold" : undefined}
      borderColor={isSelected ? "cyan" : undefined}
    >
      {/* Title row */}
      <Box flexDirection="row">
        <Badge color={task.projectColor}>
          {task.projectName.slice(0, 3).toUpperCase()}
        </Badge>
        <Text> </Text>
        <Text wrap="truncate">{task.title}</Text>
        {task.durationMinutes ? (
          <>
            <Text> </Text>
            <Text dimColor>{formatDuration(task.durationMinutes)}</Text>
          </>
        ) : null}
      </Box>

      {/* Description expanded when selected */}
      {task.description && isSelected ? (
        <Box paddingLeft={6}>
          <Text dimColor>{task.description}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
