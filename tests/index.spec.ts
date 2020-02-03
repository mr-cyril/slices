import { compileTemplate, buildReducers, generateSelectorAndActions, compileSlice } from "../src";

describe("index", () => {
  it("ensure exports are defined", () => {
    expect(compileTemplate).toBeDefined();
    expect(buildReducers).toBeDefined();
    expect(generateSelectorAndActions).toBeDefined();
    expect(compileSlice).toBeDefined();
  });
});
