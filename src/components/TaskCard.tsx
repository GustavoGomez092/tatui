import React from "react";
import { Box, Text } from "ink";
import { type TaskWithProject } from "../db/tasks.js";
import { formatDuration } from "../utils/week.js";

interface TaskCardProps {
  task: TaskWithProject;
  isSelected: boolean;
}

export function TaskCard({ task, isSelected }: TaskCardProps) {
  return (
    <Box
      flexDirection="row"
      paddingX={1}
      borderStyle={isSelected ? "bold" : undefined}
      borderColor={isSelected ? "cyan" : undefined}
    >
      <Text color={task.projectColor} bold>
        [{task.projectName.slice(0, 3).toUpperCase()}]
      </Text>
      <Text> </Text>
      <Text wrap="truncate">{task.title}</Text>
      {task.durationMinutes ? (
        <>
          <Text> </Text>
          <Text dimColor>{formatDuration(task.durationMinutes)}</Text>
        </>
      ) : null}
    </Box>
  );
}
