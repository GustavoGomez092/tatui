import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { AutocompleteInput } from "./AutocompleteInput.js";
import { isShorthand } from "../utils/parser.js";

type InputStep = "title" | "project";

interface TaskInputProps {
  projectNames: string[];
  onSubmit: (input: string) => void;
  onCancel: () => void;
  isActive: boolean;
}

export function TaskInput({
  projectNames,
  onSubmit,
  onCancel,
  isActive,
}: TaskInputProps) {
  const [value, setValue] = useState("");
  const [step, setStep] = useState<InputStep>("title");
  const [pendingTitle, setPendingTitle] = useState("");
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);

  const shorthandSuggestions = useMemo(
    () => projectNames.map((p) => p + "::"),
    [projectNames]
  );

  const handleTitleSubmit = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) {
        onCancel();
        return;
      }

      if (isShorthand(trimmed)) {
        // Shorthand — submit directly
        onSubmit(trimmed);
        setValue("");
        setStep("title");
        return;
      }

      // Plain title — move to project selection step
      setPendingTitle(trimmed);
      setValue("");
      setSelectedProjectIdx(0);
      setStep("project");
    },
    [onSubmit, onCancel]
  );

  const handleProjectSubmit = useCallback(
    (val: string) => {
      const projectName = val.trim();
      if (!projectName) return;
      // Build shorthand from selected project + pending title
      onSubmit(`${projectName}::${pendingTitle}`);
      setValue("");
      setPendingTitle("");
      setStep("title");
    },
    [onSubmit, pendingTitle]
  );

  useInput(
    (_input, key) => {
      if (!isActive) return;
      if (key.escape) {
        if (step === "project") {
          // Go back to title step
          setValue(pendingTitle);
          setPendingTitle("");
          setStep("title");
        } else {
          onCancel();
          setValue("");
        }
      }
    },
    { isActive }
  );

  // For project step: allow j/k or arrows to select from list
  useInput(
    (input, key) => {
      if (!isActive || step !== "project" || value) return;
      if (key.downArrow || input === "j") {
        setSelectedProjectIdx((i) => Math.min(i + 1, projectNames.length - 1));
      }
      if (key.upArrow || input === "k") {
        setSelectedProjectIdx((i) => Math.max(i - 1, 0));
      }
      if (key.return && projectNames.length > 0 && !value) {
        // Select from list
        onSubmit(`${projectNames[selectedProjectIdx]}::${pendingTitle}`);
        setValue("");
        setPendingTitle("");
        setStep("title");
      }
    },
    { isActive: isActive && step === "project" }
  );

  if (!isActive) return null;

  if (step === "project") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="yellow">
        <Text bold color="yellow">
          Select Project for: <Text color="white">{pendingTitle}</Text>
        </Text>
        <Box marginTop={1}>
          <Text>{">"} </Text>
          <AutocompleteInput
            value={value}
            onChange={setValue}
            onSubmit={handleProjectSubmit}
            suggestions={projectNames}
            placeholder="Type project name or select below"
            isActive={isActive}
          />
        </Box>
        {projectNames.length > 0 && !value ? (
          <Box flexDirection="column" marginTop={1}>
            {projectNames.map((name, i) => (
              <Text key={name}>
                {i === selectedProjectIdx ? (
                  <Text color="cyan">{"> "}{name}</Text>
                ) : (
                  <Text dimColor>{"  "}{name}</Text>
                )}
              </Text>
            ))}
          </Box>
        ) : null}
        <Text dimColor>
          Type to filter or create new | j/k to browse
        </Text>
      </Box>
    );
  }

  const usingShorthand = isShorthand(value);

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="green">
      <Text bold color="green">
        New Task {usingShorthand ? "(shorthand)" : ""}
      </Text>
      <Box>
        <Text>{">"} </Text>
        <AutocompleteInput
          value={value}
          onChange={setValue}
          onSubmit={handleTitleSubmit}
          suggestions={shorthandSuggestions}
          placeholder="project::title::desc::duration or task title"
          isActive={isActive}
        />
      </Box>
      {usingShorthand ? (
        <Text dimColor>Shorthand detected — Enter to create</Text>
      ) : null}
    </Box>
  );
}
