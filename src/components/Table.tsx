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

function padCell(value: string, width: number, padding: number, fillChar = " "): string {
  const contentWidth = width - padding * 2;
  let display = value;
  if (display.length > contentWidth) {
    display = contentWidth > 2 ? display.slice(0, contentWidth - 2) + ".." : display.slice(0, contentWidth);
  }
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

function renderDataRow(
  cols: ColumnInfo[],
  data: Record<string, Scalar>,
  padding: number,
  Cell: (props: CellProps) => React.ReactElement,
  Skeleton: (props: { children: React.ReactNode }) => React.ReactElement
) {
  return (
    <Box flexDirection="row">
      <Skeleton>{"│"}</Skeleton>
      {cols.map((col, idx) => {
        const raw = data[col.key];
        const value = raw == null ? "" : String(raw);
        const padded = padCell(value, col.width, padding);
        return (
          <React.Fragment key={col.key}>
            {idx > 0 ? <Skeleton>{"│"}</Skeleton> : null}
            <Cell column={idx} columnKey={col.key}>
              {padded}
            </Cell>
          </React.Fragment>
        );
      })}
      <Skeleton>{"│"}</Skeleton>
    </Box>
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
  const HeadingCell = ({ children, column, columnKey }: CellProps) => (
    <HeaderComp>{children}</HeaderComp>
  );

  return (
    <Box flexDirection="column">
      {/* Top border: ┌──────┬──────┐ */}
      {renderBorderRow(cols, { line: "─", left: "┌", right: "┐", cross: "┬" }, SkeletonComp)}

      {/* Heading: │ Name │ Age  │ */}
      {renderDataRow(cols, headingData, padding, HeadingCell, SkeletonComp)}

      {/* For each data row */}
      {data.map((row, i) => (
        <React.Fragment key={i}>
          {/* Separator: ├──────┼──────┤ */}
          {renderBorderRow(cols, { line: "─", left: "├", right: "┤", cross: "┼" }, SkeletonComp)}
          {/* Data: │ Alice│ 30   │ */}
          {renderDataRow(cols, row as Record<string, Scalar>, padding, CellComp, SkeletonComp)}
        </React.Fragment>
      ))}

      {/* Bottom border: └──────┴──────┘ */}
      {renderBorderRow(cols, { line: "─", left: "└", right: "┘", cross: "┴" }, SkeletonComp)}
    </Box>
  );
}
