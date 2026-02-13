import React, { useMemo } from "react";
import { Box, Text } from "ink";

type Scalar = string | number | boolean | null | undefined;
type ScalarDict = Record<string, Scalar>;

interface CellProps {
  children: React.ReactNode;
  column: number;
  columnKey: string;
}

interface TableProps<T extends ScalarDict> {
  data: T[];
  columns?: (keyof T)[];
  padding?: number;
  maxColumnWidths?: Partial<Record<keyof T, number>>;
  header?: (props: { children: React.ReactNode }) => React.ReactElement;
  cell?: (props: CellProps) => React.ReactElement;
  skeleton?: (props: { children: React.ReactNode }) => React.ReactElement;
}

function DefaultHeader({ children }: { children: React.ReactNode }) {
  return <Text bold>{children}</Text>;
}

function DefaultCell({ children }: CellProps) {
  return <Text>{children}</Text>;
}

function DefaultSkeleton({ children }: { children: React.ReactNode }) {
  return <Text dimColor>{children}</Text>;
}

interface ColumnInfo {
  key: string;
  width: number;
}

function wordWrap(text: string, maxWidth: number): string[] {
  if (!text) return [""];
  if (text.length <= maxWidth) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
    // Force-break words longer than maxWidth
    while (current.length > maxWidth) {
      lines.push(current.slice(0, maxWidth));
      current = current.slice(maxWidth);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function getColumns<T extends ScalarDict>(
  data: T[],
  columns: (keyof T)[],
  padding: number,
  maxWidths?: Partial<Record<keyof T, number>>
): ColumnInfo[] {
  return columns.map((col) => {
    const key = String(col);
    const headerLen = key.length;
    const maxDataLen = data.reduce((max, row) => {
      const val = row[col];
      const len = val == null ? 0 : String(val).length;
      return Math.max(max, len);
    }, 0);
    let contentWidth = Math.max(headerLen, maxDataLen);
    const maxW = maxWidths?.[col];
    if (maxW && contentWidth > maxW) {
      contentWidth = maxW;
    }
    return { key, width: contentWidth + padding * 2 };
  });
}

function padLine(line: string, width: number, padding: number, fillChar = " "): string {
  const contentWidth = width - padding * 2;
  const display = line.slice(0, contentWidth);
  const leftPad = fillChar.repeat(padding);
  const rightPad = fillChar.repeat(Math.max(0, width - padding - display.length));
  return leftPad + display + rightPad;
}

interface RowConfig {
  line: string;
  left: string;
  right: string;
  cross: string;
}

function renderBorderRow(
  cols: ColumnInfo[],
  config: RowConfig,
  Skeleton: (props: { children: React.ReactNode }) => React.ReactElement
) {
  return (
    <Box flexDirection="row">
      <Skeleton>{config.left}</Skeleton>
      {cols.map((col, idx) => (
        <React.Fragment key={col.key}>
          {idx > 0 ? <Skeleton>{config.cross}</Skeleton> : null}
          <Skeleton>{config.line.repeat(col.width)}</Skeleton>
        </React.Fragment>
      ))}
      <Skeleton>{config.right}</Skeleton>
    </Box>
  );
}

function renderMultiLineDataRow(
  cols: ColumnInfo[],
  data: Record<string, Scalar>,
  padding: number,
  Cell: (props: CellProps) => React.ReactElement,
  Skeleton: (props: { children: React.ReactNode }) => React.ReactElement
) {
  // Word-wrap each cell's content
  const wrappedCells = cols.map((col) => {
    const raw = data[col.key];
    const value = raw == null ? "" : String(raw);
    const contentWidth = col.width - padding * 2;
    return wordWrap(value, contentWidth);
  });

  // Find the tallest cell
  const maxLines = Math.max(...wrappedCells.map((lines) => lines.length), 1);

  // Render one <Box flexDirection="row"> per line
  return (
    <>
      {Array.from({ length: maxLines }, (_, lineIdx) => (
        <Box flexDirection="row" key={lineIdx}>
          <Skeleton>{"│"}</Skeleton>
          {cols.map((col, colIdx) => {
            const lines = wrappedCells[colIdx]!;
            const line = lines[lineIdx] ?? "";
            const padded = padLine(line, col.width, padding);
            return (
              <React.Fragment key={col.key}>
                {colIdx > 0 ? <Skeleton>{"│"}</Skeleton> : null}
                <Cell column={colIdx} columnKey={col.key}>
                  {padded}
                </Cell>
              </React.Fragment>
            );
          })}
          <Skeleton>{"│"}</Skeleton>
        </Box>
      ))}
    </>
  );
}

export function Table<T extends ScalarDict>({
  data,
  columns: columnsProp,
  padding = 1,
  maxColumnWidths,
  header: HeaderComp = DefaultHeader,
  cell: CellComp = DefaultCell,
  skeleton: SkeletonComp = DefaultSkeleton,
}: TableProps<T>) {
  const columns = useMemo(() => {
    if (columnsProp) return columnsProp;
    if (data.length === 0) return [] as (keyof T)[];
    return Object.keys(data[0]!) as (keyof T)[];
  }, [columnsProp, data]);

  const cols = useMemo(
    () => getColumns(data, columns, padding, maxColumnWidths),
    [data, columns, padding, maxColumnWidths]
  );

  if (cols.length === 0) return null;

  // Build heading row data
  const headingData: Record<string, Scalar> = {};
  for (const col of columns) {
    headingData[String(col)] = String(col);
  }

  // Header cell renderer wraps in HeaderComp
  const HeadingCell = ({ children }: CellProps) => (
    <HeaderComp>{children}</HeaderComp>
  );

  return (
    <Box flexDirection="column">
      {/* Top border: ┌──────┬──────┐ */}
      {renderBorderRow(cols, { line: "─", left: "┌", right: "┐", cross: "┬" }, SkeletonComp)}

      {/* Heading: │ Name │ Age  │ */}
      {renderMultiLineDataRow(cols, headingData, padding, HeadingCell, SkeletonComp)}

      {/* For each data row */}
      {data.map((row, i) => (
        <React.Fragment key={i}>
          {/* Separator: ├──────┼──────┤ */}
          {renderBorderRow(cols, { line: "─", left: "├", right: "┤", cross: "┼" }, SkeletonComp)}
          {/* Data row (multi-line) */}
          {renderMultiLineDataRow(cols, row as Record<string, Scalar>, padding, CellComp, SkeletonComp)}
        </React.Fragment>
      ))}

      {/* Bottom border: └──────┴──────┘ */}
      {renderBorderRow(cols, { line: "─", left: "└", right: "┘", cross: "┴" }, SkeletonComp)}
    </Box>
  );
}
