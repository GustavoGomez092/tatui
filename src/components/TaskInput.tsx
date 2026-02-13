import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { isShorthand, parseDuration } from "../utils/parser.js";

type InputStep = "description" | "title" | "project" | "duration";

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
  const [step, setStep] = useState<InputStep>("description");
  const [pendingDescription, setPendingDescription] = useState("");
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingProject, setPendingProject] = useState("");
  const [durationError, setDurationError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const shorthandSuggestions = useMemo(
    () => projectNames.map((p) => p + "::"),
    [projectNames]
  );

  const resetState = useCallback(() => {
    setCurrentValue("");
    setPendingDescription("");
    setPendingTitle("");
    setPendingProject("");
    setDurationError(null);
    setStep("description");
    setInputKey((k) => k + 1);
  }, []);

  const submitTask = useCallback(
    (duration: string | undefined) => {
      // Description is always provided (required in step 1)
      let shorthand = `${pendingProject}::${pendingTitle}::${pendingDescription}`;
      if (duration) {
        shorthand += `::${duration}`;
      }
      onSubmit(shorthand);
      resetState();
    },
    [onSubmit, pendingProject, pendingTitle, pendingDescription, resetState]
  );

  // Step 1: Description (or shorthand entry)
  const handleDescriptionSubmit = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) {
        onCancel();
        return;
      }

      if (isShorthand(trimmed)) {
        onSubmit(trimmed);
        resetState();
        return;
      }

      setPendingDescription(trimmed);
      setCurrentValue("");
      setStep("title");
      setInputKey((k) => k + 1);
    },
    [onSubmit, onCancel, resetState]
  );

  // Step 2: Title
  const handleTitleSubmit = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      setPendingTitle(trimmed);
      setCurrentValue("");
      setStep("project");
      setInputKey((k) => k + 1);
    },
    []
  );

  // Step 3: Project
  const handleProjectSubmit = useCallback(
    (val: string) => {
      const projectName = val.trim();
      if (!projectName) return;
      setPendingProject(projectName);
      setCurrentValue("");
      setStep("duration");
      setInputKey((k) => k + 1);
    },
    []
  );

  // Step 4: Duration
  const handleDurationSubmit = useCallback(
    (val: string) => {
      const trimmed = val.trim();

      if (!trimmed) {
        // Skip duration
        submitTask(undefined);
        return;
      }

      const minutes = parseDuration(trimmed);
      if (minutes === undefined) {
        setDurationError("Invalid format — use 15m, 1h, 1.5h, 2h, 1d");
        return;
      }
      submitTask(trimmed);
    },
    [submitTask]
  );

  // Escape: back-navigate through steps
  useInput(
    (_input, key) => {
      if (!isActive) return;
      if (key.escape) {
        if (step === "duration") {
          setCurrentValue(pendingProject);
          setPendingProject("");
          setDurationError(null);
          setStep("project");
          setInputKey((k) => k + 1);
        } else if (step === "project") {
          setCurrentValue(pendingTitle);
          setPendingTitle("");
          setStep("title");
          setInputKey((k) => k + 1);
        } else if (step === "title") {
          setCurrentValue(pendingDescription);
          setPendingDescription("");
          setStep("description");
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

  // Step 1: Description (entry point, also handles shorthand)
  if (step === "description") {
    const usingShorthand = isShorthand(currentValue);
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="green">
        <Text bold color="green">
          New Task {usingShorthand ? "(shorthand)" : "— Step 1: Description"}
        </Text>
        <Box>
          <Text>{">"} </Text>
          <TextInput
            key={`desc-${inputKey}`}
            defaultValue={currentValue}
            onChange={setCurrentValue}
            onSubmit={handleDescriptionSubmit}
            suggestions={shorthandSuggestions}
            placeholder="What needs to be done? (or project::title::desc::time)"
            isDisabled={!isActive}
          />
        </Box>
        {usingShorthand ? (
          <Text dimColor>Shorthand detected — Enter to create</Text>
        ) : null}
      </Box>
    );
  }

  // Step 2: Title
  if (step === "title") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="yellow">
        <Text bold color="yellow">
          Step 2: Task Title
        </Text>
        <Text dimColor>Description: {pendingDescription}</Text>
        <Box marginTop={1}>
          <Text>{">"} </Text>
          <TextInput
            key={`title-${inputKey}`}
            defaultValue={currentValue}
            onChange={setCurrentValue}
            onSubmit={handleTitleSubmit}
            placeholder="Short task name"
            isDisabled={!isActive}
          />
        </Box>
      </Box>
    );
  }

  // Step 3: Project
  if (step === "project") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="cyan">
        <Text bold color="cyan">
          Step 3: Project for: <Text color="white">{pendingTitle}</Text>
        </Text>
        <Box marginTop={1}>
          <Text>{">"} </Text>
          <TextInput
            key={`project-${inputKey}`}
            defaultValue={currentValue}
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

  // Step 4: Duration
  return (
    <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="magenta">
      <Text bold color="magenta">
        Step 4: Time Estimate for: <Text color="white">{pendingTitle}</Text>
      </Text>
      <Text dimColor>Enter to skip — formats: 15m, 1h, 1.5h, 2h, 1d</Text>
      <Box marginTop={1}>
        <Text>{">"} </Text>
        <TextInput
          key={`duration-${inputKey}`}
          onChange={(val) => { setCurrentValue(val); setDurationError(null); }}
          onSubmit={handleDurationSubmit}
          placeholder="e.g. 1.5h (optional)"
          isDisabled={!isActive}
        />
      </Box>
      {durationError ? (
        <Text color="red">{durationError}</Text>
      ) : null}
    </Box>
  );
}
