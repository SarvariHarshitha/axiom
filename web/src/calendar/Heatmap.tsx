import { ActivityCalendar } from "react-activity-calendar";
import type { CalendarEntry } from "../api.js";
import { HoverCard } from "./HoverCard.js";

interface HeatmapProps {
  entries: CalendarEntry[];
  onSelectDate: (date: string) => void;
}

export function Heatmap({ entries, onSelectDate }: HeatmapProps) {
  const byDate = new Map(entries.map((e) => [e.date, e]));

  const data = entries.map((e) => ({ date: e.date, count: e.count, level: e.level as 0 | 1 | 2 }));

  if (data.length === 0) {
    return <p style={{ color: "#888" }}>No completed days yet.</p>;
  }

  return (
    <ActivityCalendar
      data={data}
      colorScheme="dark"
      theme={{
        dark: ["#17171b", "#3730a3", "#6366f1"]
      }}
      renderBlock={(block, activity) => {
        const entry = byDate.get(activity.date);
        if (!entry) return block;
        return (
          <HoverCard entry={entry}>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
            <g onClick={() => onSelectDate(activity.date)} style={{ cursor: "pointer" }}>
              {block}
            </g>
          </HoverCard>
        );
      }}
    />
  );
}
