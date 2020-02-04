import { generateSelectorAndActions, mergeSlices, ISlice } from "../src/slices";
import { getSegments } from "../src/actions";
import { payloadReducer } from "../src/reducers";
import { compileSlice } from "../src";

interface ISlice1State {
  a: number,
  b: string
}

const state = {
  slice1: { a: 1, b: "2" }
};

const slice1: ISlice<ISlice1State> = {
  name: "slice1",
  reducer: payloadReducer,
  nodes: {
    a: {
      reducer: payloadReducer
    },
    b: {
      reducer: payloadReducer,
      actions: { custom: payloadReducer }
    },
    name:{reducer: payloadReducer}
  },
  initial: state.slice1
};

const slice2: ISlice = {
  name: "slice2",
  nodes: { c: { reducer: payloadReducer } },
  reducer: payloadReducer,
  mountPoint: ["slice1"],
  initial: { c: 1 }
};

const slice3: ISlice = {
  name: "slice3",
  reducer: payloadReducer,
  mountPoint: ["slice1", "newPoint"],
};


describe(generateSelectorAndActions.name, () => {
  const { select, action } = generateSelectorAndActions<ISlice1State>(slice1);
  it("selector generated correctly", () => {
    expect(select(state)).toEqual({ a: 1, b: "2" });
    expect(select({ slice1: undefined })).toEqual({ a: 1, b: "2" });
  });
  it("selector walks state correctly", () => {
    const { select } = generateSelectorAndActions(slice2);
    expect(select({ slice1: undefined })).toEqual({ c: 1 });
  });
  it("actions generated correctly", () => {
    expect(action).toBeTruthy();
    expect(getSegments(action)).toEqual(["slice1"]);
    expect(Object.keys(action)).toEqual(["toString", "a", "b", "name_"]);
  });
});

describe(mergeSlices.name, () => {
  it("throws on duplicate", () => {
    expect(() => mergeSlices([slice1, { name: "slice1", reducer: payloadReducer }])).toThrow();
  });
  it("throws on duplicate mount points", () => {
    expect(() => mergeSlices([slice3, { name: "slice3", reducer: payloadReducer, mountPoint: ["slice1", "newPoint"] }])).toThrow();
  });
  it("does not throw on multiple same slices", () => {
    expect(() => mergeSlices([slice1, slice1])).not.toThrow();
  });
  it("merges correctly", () => {
    const merged = mergeSlices([slice1, slice2]);
    expect(merged).toBeTruthy();
    expect(merged.level).toEqual(0);
    expect(merged.children).toBeTruthy();
    expect(Object.keys(merged.children!)).toEqual(["slice1"]);
    expect(Object.keys(merged.children?.slice1.children!)).toEqual(["slice2"]);
  });
  it ("merges at non-existent points", ()=>{
    const merged = mergeSlices([slice1, slice3]);
    expect(merged).toBeTruthy();
    expect(merged.children?.slice1?.children?.newPoint).toBeTruthy();
  })
});

describe(compileSlice.name, () => {
  it("compiles", () => {
    const tree = compileSlice<ISlice1State>("slice1", { a: {}, b: {} }, state.slice1);
    expect(tree).toBeTruthy(); // we tested the result in other tests, so just call for the coverage's sake
  });
});

