import { BENCHMARK_VERSION, ERROR_CODES, TIME_CONTROLS, } from "@llm-chess-arena/shared";
import { describe, expect, it, } from "vitest";

describe("Server Setup", () => {
  it("should import shared constants", () => {
    expect(ERROR_CODES.ILLEGAL_MOVE,).toBe("ILLEGAL_MOVE",);
    expect(TIME_CONTROLS.RAPID_10_5,).toBe("10+5",);
    expect(BENCHMARK_VERSION,).toBe("0.1.0",);
  });

  it("should have all error codes defined", () => {
    expect(Object.keys(ERROR_CODES,),).toHaveLength(12,);
  });

  it("should have all time controls defined", () => {
    expect(Object.keys(TIME_CONTROLS,),).toHaveLength(3,);
  });
});
