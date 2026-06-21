export const scheduleDays = [
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type ScheduleDay = (typeof scheduleDays)[number];

export type DailyScheduleItem = {
  id: string;
  day: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order?: number | null;
  created_at: string | null;
};

export function getScheduleDayIndex(day: string) {
  const index = scheduleDays.indexOf(day as ScheduleDay);
  return index === -1 ? scheduleDays.length : index;
}

export function formatScheduleTime(item: DailyScheduleItem) {
  if (item.start_time && item.end_time) {
    return `${item.start_time} – ${item.end_time}`;
  }

  return item.start_time || item.end_time || "Time TBD";
}

export function compareScheduleItems(a: DailyScheduleItem, b: DailyScheduleItem) {
  const aOrder =
    typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
  const bOrder =
    typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  const timeCompare = String(a.start_time || "").localeCompare(
    String(b.start_time || ""),
  );

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return (
    String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
    a.title.localeCompare(b.title)
  );
}

export function groupScheduleItems(items: DailyScheduleItem[]) {
  return scheduleDays.map((day) => ({
    day,
    items: items
      .filter((item) => item.day === day)
      .sort(compareScheduleItems),
  }));
}
