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

export function groupScheduleItems(items: DailyScheduleItem[]) {
  return scheduleDays.map((day) => ({
    day,
    items: items
      .filter((item) => item.day === day)
      .sort((a, b) => {
        const timeCompare = String(a.start_time || "").localeCompare(
          String(b.start_time || ""),
        );

        if (timeCompare !== 0) {
          return timeCompare;
        }

        return a.title.localeCompare(b.title);
      }),
  }));
}
