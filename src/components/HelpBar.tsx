import React from "react";
import { Box, Text } from "ink";

interface HelpBarProps {
  mode: string;
}

const HELP: Record<string, string> = {
  navigate: "h/l:columns  j/k:rows  Enter:advance  o:open  b:back  n:new  p:filter  s:summary  d:delete  r:refresh  q:quit",
  input: "Enter:create  Tab:autocomplete  Esc:cancel",
  summary: "s/Esc:back to board  q:quit",
  detail: "Esc/Enter:back to board  q:quit",
};

export function HelpBar({ mode }: HelpBarProps) {
  return (
    <Box paddingX={1}>
      <Text dimColor>{HELP[mode] ?? HELP.navigate}</Text>
    </Box>
  );
}
