import React from "react";
import { Box, Text } from "ink";
import { type TaskWithProject } from "../db/tasks.js";
import { formatDuration } from "../utils/week.js";

interface TaskDetailProps {
  task: TaskWithProject;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "blue" },
  "in-progress": { label: "In Progress", color: "yellow" },
  done: { label: "Done", color: "green" },
  archived: { label: "Archived", color: "gray" },
};

export function TaskDetail({ task }: TaskDetailProps) {
  const status = STATUS_DISPLAY[task.status] ?? { label: task.status, color: "white" };

  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      borderStyle="double"
      borderColor="cyan"
      flexGrow={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text color={task.projectColor} bold>
          [{task.projectName}]
        </Text>
        <Text> </Text>
        <Text bold>{task.title}</Text>
      </Box>

      {/* Metadata row */}
      <Box gap={3} marginBottom={1}>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={status.color}>{status.label}</Text>
        </Box>
        {task.durationMinutes ? (
          <Box>
            <Text dimColor>Duration: </Text>
            <Text>{formatDuration(task.durationMinutes)}</Text>
          </Box>
        ) : null}
        <Box>
          <Text dimColor>Created: </Text>
          <Text>{new Date(task.createdAt).toLocaleDateString()}</Text>
        </Box>
      </Box>

      {/* Description */}
      {task.description ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Description:</Text>
          <Box paddingLeft={1}>
            <Text>{task.description}</Text>
          </Box>
        </Box>
      ) : (
        <Box marginBottom={1}>
          <Text dimColor italic>No description</Text>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>Esc/Enter: back to board</Text>
      </Box>
    </Box>
  );
}
