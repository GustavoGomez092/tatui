import React from "react";
import { Box, Text } from "ink";
import { type TaskWithProject } from "../db/tasks.js";
import { formatDuration } from "../utils/week.js";

interface TaskCardProps {
  task: TaskWithProject;
  isSelected: boolean;
}

function clampText(text: string, maxLines: number, lineWidth: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length > lineWidth && currentLine) {
      lines.push(currentLine);
      if (lines.length >= maxLines) break;
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length >= maxLines) {
    const last = lines[maxLines - 1];
    if (words.join(" ").length > lines.join(" ").length && last) {
      lines[maxLines - 1] =
        last.length > lineWidth - 1
          ? last.slice(0, lineWidth - 1) + "…"
          : last + "…";
    }
  }

  return lines.slice(0, maxLines).join("\n");
}

export function TaskCard({ task, isSelected }: TaskCardProps) {
  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle={isSelected ? "bold" : undefined}
      borderColor={isSelected ? "cyan" : undefined}
      marginBottom={task.description && isSelected ? 0 : 0}
    >
      {/* Title row */}
      <Box flexDirection="row">
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

      {/* Description (3-line clamped, only when selected) */}
      {task.description && isSelected ? (
        <Box paddingLeft={6} marginTop={0}>
          <Text dimColor wrap="truncate">
            {clampText(task.description, 3, 40)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
