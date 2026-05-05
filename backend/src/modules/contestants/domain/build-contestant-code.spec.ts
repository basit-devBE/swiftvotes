import {
  buildContestantCode,
  extractEventInitials,
} from "./build-contestant-code";

describe("build contestant code", () => {
  it("uses up to the first three letters of the first three event words", () => {
    expect(extractEventInitials("Annual Best Female Category Awards")).toBe(
      "ANNBESFEM",
    );
  });

  it("uses available letters for short event names", () => {
    expect(extractEventInitials("AV")).toBe("AV");
    expect(extractEventInitials("Esi Boating")).toBe("ESIBOA");
  });

  it("falls back when the event name has no usable words", () => {
    expect(extractEventInitials("   ")).toBe("EV");
  });

  it("formats the sequence as four digits", () => {
    expect(buildContestantCode("ANNBESFEM", 3)).toBe("ANNBESFEM-0003");
  });
});
