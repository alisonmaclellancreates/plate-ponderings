import { describe, expect, it } from "vitest";
import {
  JURISDICTION_ERROR,
  TEXT_EMPTY_ERROR,
  TEXT_ERROR,
  TEXT_LENGTH_ERROR,
  validateSpot,
} from "@/lib/spot";

describe("validateSpot", () => {
  it("requires a jurisdiction and plate text of up to 8 allowed characters", () => {
    expect(validateSpot({ jurisdiction: "Utah", text: "TR-AI LS" })).toEqual({});
    expect(validateSpot({ jurisdiction: "Utah", text: "ABCD-EFGH" })).toEqual({});
    expect(validateSpot({})).toEqual({
      jurisdiction: JURISDICTION_ERROR,
      text: TEXT_EMPTY_ERROR,
    });
    expect(validateSpot({ jurisdiction: "Utah", text: "   " }).text).toBe(TEXT_EMPTY_ERROR);
    expect(validateSpot({ jurisdiction: "Utah", text: " - - " }).text).toBe(TEXT_EMPTY_ERROR);
    expect(validateSpot({ jurisdiction: "Utah", text: "HI@@!" }).text).toBe(TEXT_ERROR);
    expect(validateSpot({ jurisdiction: "Utah", text: "ABCDEFGHI" }).text).toBe(TEXT_LENGTH_ERROR);
    expect(validateSpot({ jurisdiction: "Utah", text: "ABCD-EFGH-I" }).text).toBe(
      TEXT_LENGTH_ERROR,
    );
  });
});
