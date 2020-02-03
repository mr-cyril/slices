import { getSegments, newActionCreator } from "../src/actions";
import { isFunction } from "../src/utils";

const segments = ["a", "b", "c"];
const ac = newActionCreator(segments);

describe(newActionCreator.name, () => {
  it("throws on invalid path", () => {
    expect(() => newActionCreator([])).toThrow();
  });
  it("action creator is a function", () => {
    expect(isFunction(ac)).toBe(true);
  });
  it("action creator creates valid action", () => {
    const a = ac("payload", "meta", false);
    expect(a.type).toBe(segments.join("/"));
    expect(a.payload).toBe("payload");
    expect(a.meta).toBe("meta");
    expect(a.error).toBe(false);
    expect(ac.toString()===a.type).toBe(true);
  });
});

describe(getSegments.name, () => {
  it("returns action creator segments", () => {
    expect(getSegments(ac) === segments).toBe(true);
  });
});
