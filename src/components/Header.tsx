import React from "react";
import { Box, Text } from "ink";
import { type TaskWithProject } from "../db/tasks.js";
import { formatDuration } from "../utils/week.js";

interface HeaderProps {
  weekId: string;
  tasks: TaskWithProject[];
  activeFilter?: string;
}

export function Header({ weekId, tasks, activeFilter }: HeaderProps) {
  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const total = todo + inProgress + done;

  const totalDuration = tasks.reduce(
    (sum, t) => sum + (t.durationMinutes ?? 0),
    0
  );
  const doneDuration = tasks
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + (t.durationMinutes ?? 0), 0);

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        <Text bold color="cyan">
          TATUI
        </Text>
        <Text dimColor>|</Text>
        <Text bold>{weekId}</Text>
        {activeFilter ? (
          <>
            <Text dimColor>|</Text>
            <Text color="yellow">Filter: {activeFilter}</Text>
          </>
        ) : null}
      </Box>
      <Box gap={2}>
        <Text>
          <Text color="blue">{todo}</Text>
          <Text dimColor>/</Text>
          <Text color="yellow">{inProgress}</Text>
          <Text dimColor>/</Text>
          <Text color="green">{done}</Text>
          <Text dimColor> of {total}</Text>
        </Text>
        {totalDuration > 0 ? (
          <Text dimColor>
            {formatDuration(doneDuration)}/{formatDuration(totalDuration)}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
