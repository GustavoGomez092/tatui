import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { AutocompleteInput } from "./AutocompleteInput.js";
import { type TaskWithProject } from "../db/tasks.js";
import { formatDuration } from "../utils/week.js";
import { parseDuration } from "../utils/parser.js";

type DetailField = "title" | "project" | "description" | "duration";
const FIELDS: DetailField[] = ["title", "project", "description", "duration"];

interface TaskDetailProps {
  task: TaskWithProject;
  projectNames: string[];
  onUpdateField: (
    id: number,
    data: Partial<Pick<TaskWithProject, "title" | "description" | "durationMinutes">>
  ) => void;
  onChangeProject: (id: number, projectName: string) => void;
  onClose: () => void;
  isActive: boolean;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "blue" },
  "in-progress": { label: "In Progress", color: "yellow" },
  done: { label: "Done", color: "green" },
  archived: { label: "Archived", color: "gray" },
};

export function TaskDetail({
  task,
  projectNames,
  onUpdateField,
  onChangeProject,
  onClose,
  isActive,
}: TaskDetailProps) {
  const [focusedField, setFocusedField] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const status = STATUS_DISPLAY[task.status] ?? {
    label: task.status,
    color: "white",
  };

  const currentField = FIELDS[focusedField];

  const getFieldValue = useCallback(
    (field: DetailField): string => {
      switch (field) {
        case "title":
          return task.title;
        case "project":
          return task.projectName;
        case "description":
          return task.description ?? "";
        case "duration":
          return task.durationMinutes
            ? formatDuration(task.durationMinutes)
            : "";
      }
    },
    [task]
  );

  const startEditing = useCallback(() => {
    setEditValue(getFieldValue(currentField));
    setEditing(true);
    setErrorMsg(null);
  }, [currentField, getFieldValue]);

  const saveEdit = useCallback(
    (val: string) => {
      const trimmed = val.trim();

      switch (currentField) {
        case "title":
          if (!trimmed) {
            setErrorMsg("Title cannot be empty");
            return;
          }
          onUpdateField(task.id, { title: trimmed });
          break;
        case "description":
          onUpdateField(task.id, {
            description: trimmed || null,
          });
          break;
        case "duration": {
          if (!trimmed) {
            onUpdateField(task.id, { durationMinutes: null });
            break;
          }
          const minutes = parseDuration(trimmed);
          if (minutes === undefined) {
            setErrorMsg("Invalid duration (use 15m, 1h, 1.5h, 2h, 1d)");
            return;
          }
          onUpdateField(task.id, { durationMinutes: minutes });
          break;
        }
        case "project":
          if (!trimmed) {
            setErrorMsg("Project name cannot be empty");
            return;
          }
          onChangeProject(task.id, trimmed);
          break;
      }

      setEditing(false);
      setEditValue("");
      setErrorMsg(null);
    },
    [currentField, task.id, onUpdateField, onChangeProject]
  );

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditValue("");
    setErrorMsg(null);
  }, []);

  // Navigation mode: j/k to move between fields, Enter/e to edit, Esc to close
  useInput(
    (input, key) => {
      if (!isActive || editing) return;

      if (key.escape) {
        onClose();
        return;
      }

      if (input === "q") {
        onClose();
        return;
      }

      if (key.downArrow || input === "j") {
        setFocusedField((i) => Math.min(i + 1, FIELDS.length - 1));
        return;
      }

      if (key.upArrow || input === "k") {
        setFocusedField((i) => Math.max(i - 1, 0));
        return;
      }

      if (key.return || input === "e") {
        startEditing();
        return;
      }
    },
    { isActive: isActive && !editing }
  );

  // Edit mode: Escape cancels the current field edit
  // Note: AutocompleteInput also catches Escape to clear text, both fire together.
  // This is fine — clearing + canceling is the desired behavior.
  useInput(
    (_input, key) => {
      if (!isActive || !editing) return;
      if (key.escape) {
        cancelEdit();
      }
    },
    { isActive: isActive && editing }
  );

  const suggestions = useMemo(
    () => (currentField === "project" ? projectNames : []),
    [currentField, projectNames]
  );

  function renderField(field: DetailField, idx: number) {
    const isFocused = focusedField === idx;
    const isEditing = editing && isFocused;

    const label =
      field === "title"
        ? "Title"
        : field === "project"
          ? "Project"
          : field === "description"
            ? "Description"
            : "Duration";

    const displayValue = getFieldValue(field);

    return (
      <Box key={field} flexDirection="column">
        <Box>
          <Text color={isFocused ? "cyan" : undefined} bold={isFocused}>
            {isFocused ? ">" : " "} {label}:{" "}
          </Text>
          {isEditing ? (
            <AutocompleteInput
              value={editValue}
              onChange={setEditValue}
              onSubmit={saveEdit}
              suggestions={suggestions}
              placeholder={
                field === "duration"
                  ? "e.g. 15m, 1h, 1.5h, 2h, 1d"
                  : `Enter ${label.toLowerCase()}`
              }
              isActive={true}
            />
          ) : (
            <Text
              color={
                field === "project" ? task.projectColor : isFocused ? "white" : undefined
              }
              dimColor={!displayValue && !isFocused}
            >
              {displayValue || (field === "description" ? "No description" : field === "duration" ? "Not set" : "")}
            </Text>
          )}
        </Box>
        {isEditing && errorMsg ? (
          <Box paddingLeft={4}>
            <Text color="red">{errorMsg}</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      borderStyle="double"
      borderColor="cyan"
      flexGrow={1}
    >
      {/* Status + Created (read-only info) */}
      <Box gap={3} marginBottom={1}>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={status.color}>{status.label}</Text>
        </Box>
        <Box>
          <Text dimColor>Created: </Text>
          <Text>{new Date(task.createdAt).toLocaleDateString()}</Text>
        </Box>
      </Box>

      {/* Editable fields */}
      <Box flexDirection="column" gap={0}>
        {FIELDS.map((field, idx) => renderField(field, idx))}
      </Box>
    </Box>
  );
}
