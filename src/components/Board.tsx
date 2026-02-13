import React from "react";
import { Box } from "ink";
import { Column } from "./Column.js";
import { type TaskWithProject } from "../db/tasks.js";
import { type TaskStatus } from "../db/schema.js";

interface BoardProps {
  tasksByStatus: Record<TaskStatus, TaskWithProject[]>;
  activeColumn: number;
  selectedRow: number;
}

const COLUMNS: { key: TaskStatus; title: string; color: string }[] = [
  { key: "todo", title: "To Do", color: "blue" },
  { key: "in-progress", title: "In Progress", color: "yellow" },
  { key: "done", title: "Done", color: "green" },
  { key: "archived", title: "Archived", color: "gray" },
];

export function Board({ tasksByStatus, activeColumn, selectedRow }: BoardProps) {
  return (
    <Box flexDirection="row" flexGrow={1}>
      {COLUMNS.map((col, index) => (
        <Column
          key={col.key}
          title={col.title}
          tasks={tasksByStatus[col.key]}
          isActive={index === activeColumn}
          selectedIndex={selectedRow}
          color={col.color}
        />
      ))}
    </Box>
  );
}

export { COLUMNS };
