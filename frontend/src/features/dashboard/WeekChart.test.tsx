import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderComponent } from "../../test/render";
import { summary } from "../../test/fixtures";
import { WeekChart } from "./WeekChart";

describe("week chart", () => {
  it("reads as a table, so the numbers survive being read aloud", () => {
    renderComponent(<WeekChart days={summary.visitsThisWeek} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    // One header row plus seven days, including the one with no visits at all: a chart
    // that drops its empty days shifts every later bar into the wrong slot.
    expect(rows).toHaveLength(8);

    const tuesday = within(screen.getByRole("rowheader", { name: "Tue 25 Aug" }).closest("tr")!);
    expect(tuesday.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["8", "7", "1"]);
  });

  it("splits each day into segments that add up to its total", () => {
    renderComponent(<WeekChart days={summary.visitsThisWeek} />);

    for (const day of summary.visitsThisWeek) {
      const row = screen.getByRole("row", { name: new RegExp(`^${dayLabel(day.date)}`) });
      const [total, assigned, unassigned] = within(row)
        .getAllByRole("cell")
        .map((cell) => Number(cell.textContent));

      expect(assigned + unassigned).toBe(total);
    }
  });
});

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toDateString().slice(0, 3);
}
