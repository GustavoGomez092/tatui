import React from "react";
import { Box, Text } from "ink";

interface HelpBarProps {
  mode: string;
}

const HELP: Record<string, string> = {
  navigate: "h/l:columns  j/k:rows  Enter:advance  b:back  n:new  p:filter  d:delete  r:refresh  q:quit",
  input: "Enter:create  Tab:autocomplete  Esc:cancel",
};

export function HelpBar({ mode }: HelpBarProps) {
  return (
    <Box paddingX={1}>
      <Text dimColor>{HELP[mode] ?? HELP.navigate}</Text>
    </Box>
  );
}
