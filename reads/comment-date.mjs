const commentDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

export function formatCommentDate(value) {
  if (
    value == null ||
    (typeof value === "string" && !value.trim()) ||
    !["string", "number"].includes(typeof value) && !(value instanceof Date)
  ) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return {
    datetime: date.toISOString(),
    label: commentDateFormatter.format(date).toLowerCase().replace(/\s+/g, " "),
  };
}
