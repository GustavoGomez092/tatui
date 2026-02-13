export interface ParsedTask {
  project: string;
  title: string;
  description?: string;
  durationMinutes?: number;
}

const DURATION_RE = /^(\d+(?:\.\d+)?)(m|h|d)$/i;

export function parseDuration(input: string): number | undefined {
  const match = input.trim().match(DURATION_RE);
  if (!match) return undefined;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "m":
      return Math.round(value);
    case "h":
      return Math.round(value * 60);
    case "d":
      return Math.round(value * 480); // 8h workday
    default:
      return undefined;
  }
}

/**
 * Parse shorthand task syntax: project::title::description::duration
 * Minimum 2 segments (project::title), maximum 4.
 * The :: delimiter separates segments.
 */
export function parseShorthand(input: string): ParsedTask | null {
  const segments = input.split("::").map((s) => s.trim());

  if (segments.length < 2 || segments.length > 4) return null;
  if (!segments[0] || !segments[1]) return null;

  const result: ParsedTask = {
    project: segments[0],
    title: segments[1],
  };

  if (segments.length >= 3 && segments[2]) {
    // Could be description or duration
    const dur = parseDuration(segments[2]);
    if (dur !== undefined && segments.length === 3) {
      result.durationMinutes = dur;
    } else {
      result.description = segments[2];
    }
  }

  if (segments.length === 4 && segments[3]) {
    const dur = parseDuration(segments[3]);
    if (dur !== undefined) {
      result.durationMinutes = dur;
    }
  }

  return result;
}

/**
 * Check if input contains shorthand syntax (has ::)
 */
export function isShorthand(input: string): boolean {
  return input.includes("::");
}
