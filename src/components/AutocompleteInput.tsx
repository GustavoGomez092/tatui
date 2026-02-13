import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  isActive?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  suggestions,
  placeholder = "",
  isActive = true,
}: AutocompleteInputProps) {
  // Derive both match and ghostText as pure computation
  const { match, ghostText } = useMemo(() => {
    if (!value) return { match: null, ghostText: "" };
    const lower = value.toLowerCase();
    const found = suggestions.find((s) => s.toLowerCase().startsWith(lower));
    if (found && found.toLowerCase() !== lower) {
      return { match: found, ghostText: found.slice(value.length) };
    }
    return { match: null, ghostText: "" };
  }, [value, suggestions]);

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.return) {
        onSubmit(value);
        return;
      }

      if (key.tab && match) {
        onChange(match);
        return;
      }

      if (key.backspace || key.delete) {
        onChange(value.slice(0, -1));
        return;
      }

      if (key.escape) {
        onChange("");
        return;
      }

      // Only accept printable characters
      if (input && !key.ctrl && !key.meta) {
        onChange(value + input);
      }
    },
    { isActive }
  );

  return (
    <Box>
      <Text>
        {value ? (
          <>
            <Text color="white">{value}</Text>
            {ghostText ? <Text dimColor>{ghostText}</Text> : null}
          </>
        ) : (
          <Text dimColor>{placeholder}</Text>
        )}
      </Text>
      {isActive ? <Text color="cyan">▎</Text> : null}
    </Box>
  );
}
