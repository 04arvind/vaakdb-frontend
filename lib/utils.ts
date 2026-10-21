export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatRelativeDate(timestamp: number) {
  const diff = Date.now() - timestamp;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && new Date(timestamp).getDate() === new Date().getDate()) {
    return "Today";
  }
  if (diff < 2 * day) {
    return "Yesterday";
  }
  if (diff < 7 * day) {
    return "Previous 7 days";
  }
  if (diff < 30 * day) {
    return "Previous 30 days";
  }
  return "Older";
}

export function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
}

export function toCsv(columns: string[], rows: unknown[][]) {
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
