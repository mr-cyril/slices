import { buildReducers, payloadReducer, ReducerScope } from "../src/reducers";
import { IStateShape } from "../src/slices";
import { ActionCreator } from "../src";

const ComprehensiveStateShape: IStateShape = {
  children: {
    slice1: {
      slice: {
        name: "slice1",
        reducer: payloadReducer,
        nodes: {
          a: {
            reducer: payloadReducer,
            actions: {
              custom: {
                ...payloadReducer,
                subscribe: ["other/action"]
              },
              abstract:undefined,
            }
          }
        },
        initial: { a: 12345 }
      },
      level: 1
    },
    nested: {
      children: {
        nestedSlice: {
          slice: {
            name: "nestedSlice",
            reducer: payloadReducer,
            nodes: {
              b: {
                reducer: {
                  reducer: (s) => s,
                  pure: true,
                  scope: ReducerScope.Slice
                }
              },
              c: {
                reducer: {
                  reducer: (s, a) => a.payload == "keep" ? s : (s || 1) * 2,
                  pure: true,
                  scope: ReducerScope.Node
                }
              },
              d: {
                reducer: payloadReducer,
                resolver: (meta) => meta.name
              }
            },
            initial: { b: 23456 }
          },
          level: 2
        }
      },
      level: 1
    }
  },
  level: 0
};


const StateShapeWithInvalidSubscription: IStateShape = {
  children: {
    slice: {
      level: 1,
      slice: {
        name: "slice", reducer: {
          ...payloadReducer, subscribe: (() => () => {
            type:"someAction";
          }) as any as ActionCreator
        }
      }
    }
  }, level: 0
};

const StateShapeWithImpureReducerForImmer: IStateShape = {
  children: {
    slice: {
      level: 1,
      slice: {
        name: "slice", reducer: {
          reducer: (s) => {
            s.prop = 1;
          },
          pure: false,
          scope: ReducerScope.Slice
        }
      }
    }
  },
  level: 0
};


describe(buildReducers.name, () => {
  const { reducers, initial } = buildReducers(ComprehensiveStateShape);
  it("generated proper initial state tree", () => {
    expect(initial).toBeTruthy();
  });
  it("generated proper reducers", () => {
    expect(reducers).toBeTruthy();
    expect(reducers.slice1).toBeTruthy();
  });
  it("reducers work correctly", () => {
    expect(reducers.slice1({ a: 1 }, { type: "slice1", payload: { a: 2 } })).toEqual({ a: 2 });
    expect(reducers.slice1(undefined, { type: "slice1", payload: { a: 2 } })).toEqual({ a: 2 });
    expect(reducers.nested(undefined, { type: "nested/nestedSlice/c" }).nestedSlice.c).toEqual(2);
    expect(reducers.nested({ nestedSlice: { c: 3 } }, {
      type: "nested/nestedSlice/c",
      payload: "keep"
    }).nestedSlice.c).toEqual(3);
    expect(reducers.nested(undefined, { type: "nested/nestedSlice/d", payload:5, meta:{name:'z'} }).nestedSlice.z).toEqual(5);
  });
  it("reducers return initial data for unmapped actions", () => {
    expect(reducers.slice1(undefined, { type: "@@arbitrary" })).toEqual({ a: 12345 });
    expect(reducers.nested(undefined, { type: "@@arbitrary" })).toEqual({ nestedSlice: { b: 23456 } });
  });
  it("throws on invalid subscription in reducer", () => {
    expect(() => buildReducers(StateShapeWithInvalidSubscription)).toThrow();
  });
  it("use immer to wrap impure reducer", () => {
    const { reducers } = buildReducers(StateShapeWithImpureReducerForImmer, { immer: true });
    const state = { prop: "a" };
    expect(reducers.slice(state, { type: "slice" })).toEqual({ prop: 1 });
    expect(state).toEqual({ prop: "a" });
  });
  it("return empty reducer map if no slices are passed", () => {
    const { reducers } = buildReducers({ level: 0 });
    expect(reducers).toEqual({});

  });
});

