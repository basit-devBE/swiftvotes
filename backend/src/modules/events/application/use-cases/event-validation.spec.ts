import { BadRequestException } from "@nestjs/common";

import { assertValidVotePriceMinor } from "./event-validation";

describe("event validation", () => {
  it("allows free voting with zero pesewas", () => {
    expect(() => assertValidVotePriceMinor(0)).not.toThrow();
  });

  it("rejects paid voting below 50 pesewas", () => {
    expect(() => assertValidVotePriceMinor(49)).toThrow(BadRequestException);
  });

  it("allows paid voting from 50 pesewas", () => {
    expect(() => assertValidVotePriceMinor(50)).not.toThrow();
  });
});
