import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
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
  const [currentValue, setCurrentValue] = useState("");
  const [step, setStep] = useState<InputStep>("title");
  const [pendingTitle, setPendingTitle] = useState("");
  const [inputKey, setInputKey] = useState(0);

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
        onSubmit(trimmed);
        setCurrentValue("");
        setStep("title");
        setInputKey((k) => k + 1);
        return;
      }

      // Plain title — move to project selection step
      setPendingTitle(trimmed);
      setCurrentValue("");
      setStep("project");
      setInputKey((k) => k + 1);
    },
    [onSubmit, onCancel]
  );

  const handleProjectSubmit = useCallback(
    (val: string) => {
      const projectName = val.trim();
      if (!projectName) return;
      onSubmit(`${projectName}::${pendingTitle}`);
      setCurrentValue("");
      setPendingTitle("");
      setStep("title");
      setInputKey((k) => k + 1);
    },
    [onSubmit, pendingTitle]
  );

  useInput(
    (_input, key) => {
      if (!isActive) return;
      if (key.escape) {
        if (step === "project") {
          // Go back to title step with pending title restored
          setCurrentValue(pendingTitle);
          setPendingTitle("");
          setStep("title");
          setInputKey((k) => k + 1);
        } else {
          onCancel();
          setCurrentValue("");
        }
      }
    },
    { isActive }
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
          <TextInput
            key={`project-${inputKey}`}
            onChange={setCurrentValue}
            onSubmit={handleProjectSubmit}
            suggestions={projectNames}
            placeholder="Type project name"
            isDisabled={!isActive}
          />
        </Box>
      </Box>
    );
  }

  const usingShorthand = isShorthand(currentValue);

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="green">
      <Text bold color="green">
        New Task {usingShorthand ? "(shorthand)" : ""}
      </Text>
      <Box>
        <Text>{">"} </Text>
        <TextInput
          key={`title-${inputKey}`}
          defaultValue={currentValue}
          onChange={setCurrentValue}
          onSubmit={handleTitleSubmit}
          suggestions={shorthandSuggestions}
          placeholder="project::title::desc::duration or task title"
          isDisabled={!isActive}
        />
      </Box>
      {usingShorthand ? (
        <Text dimColor>Shorthand detected — Enter to create</Text>
      ) : null}
    </Box>
  );
}
