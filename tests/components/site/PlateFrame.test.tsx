import { describe, expect, it } from "vitest";
import { isInaccessible, render, screen } from "@testing-library/react";
import { PlateFrame } from "@/components/site/PlateFrame";

describe("PlateFrame", () => {
  it.each([
    ["Newfoundland and Labrador", "ROW43XYZ"],
    ["Utah", "CANYONS"],
  ])(
    "keeps the full %s name below the real Plate without another announcement",
    (jurisdiction, text) => {
      render(<PlateFrame jurisdiction={jurisdiction} text={text} />);
      const artwork = screen.getByRole("img", { name: `${jurisdiction} plate ${text}` });
      const name = screen.getByText(jurisdiction, { selector: "p" });
      expect(name.textContent).toBe(jurisdiction);
      expect(artwork.nextElementSibling).toBe(name);
      expect(isInaccessible(name)).toBe(true);
      expect(isInaccessible(artwork)).toBe(false);
      expect(screen.getAllByRole("img", { name: `${jurisdiction} plate ${text}` })).toHaveLength(1);
      expect(
        screen.getByRole("heading", { level: 1, name: `${jurisdiction} plate ${text}` }),
      ).toBeTruthy();
    },
  );
});
