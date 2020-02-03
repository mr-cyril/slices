import {
  compileTemplate,
  MetaKey,
  ReducerWithDetails,
  ISliceTemplate,
} from "../src/template";
import { IReducerDetails, payloadReducer, ReducerScope } from "../src/reducers";
import { isFunction, isObject } from "../src/utils";
import "jest-expect-message";

const ReducerIncrementFunction = (state: any) => state + 1;

const ComprehensiveTemplate: ISliceTemplate = {
  a: {},
  b: {},
  c: {
    [MetaKey]: {
      reducer: ReducerIncrementFunction,
      actions: { custom: ReducerIncrementFunction, abstract:undefined }
    }
  }
};
const SliceName = "slice";
const Initial = {
  a: 1,
  b: 2,
  c: 3
};

function isReducerDetails(r: any) {
  return isObject(r) && isFunction(r.reducer) && typeof (r.pure) === "boolean";
}

function isPayloadReducerDetails(r: any) {
  if (!isReducerDetails(r)) return false;
  if (r.pure !== true) return false;
  if (r.scope !== ReducerScope.Node) return false;
  if (r.reducer(null, { payload: 1 }) !== 1) return false;
  return true;
}

const ValidReducerShorthands: Array<{ shorthand: ReducerWithDetails, details: IReducerDetails }> = [
  {
    shorthand: ReducerIncrementFunction,
    details: {
      reducer: ReducerIncrementFunction,
      scope: ReducerScope.Slice,
      pure: false
    }
  }, {
    shorthand: [ReducerIncrementFunction, ReducerScope.Slice],
    details: {
      reducer: ReducerIncrementFunction,
      scope: ReducerScope.Slice,
      pure: false
    }
  }, {
    shorthand: [ReducerIncrementFunction, ["action"]],
    details: {
      reducer: ReducerIncrementFunction,
      scope: ReducerScope.Slice,
      pure: false,
      subscribe: ["action"]
    }
  }, {
    shorthand: {
      reducer: ReducerIncrementFunction,
      scope: ReducerScope.Slice,
      pure: false,
      subscribe: ["action"]
    },
    details: {
      reducer: ReducerIncrementFunction,
      scope: ReducerScope.Slice,
      pure: false,
      subscribe: ["action"]
    }
  }, {
    shorthand: undefined, details: payloadReducer
  }
];

describe(compileTemplate.name, () => {
  const slice = compileTemplate(SliceName, ComprehensiveTemplate, Initial);
  it("basic slice properties", () => {
    expect(slice.name).toBe(SliceName);
    expect(slice.initial).toBe(Initial);
    expect(slice.mountPoint).toBe(undefined);
    expect(slice.actions).toEqual(undefined);
    expect(isPayloadReducerDetails(slice.reducer)).toBe(true);
    expect(slice.nodes).toBeDefined();
    expect(Object.keys(slice.nodes!)).toEqual(Object.keys(ComprehensiveTemplate));
    expect(slice.nodes?.c.actions?.custom).toEqual({
      reducer: ReducerIncrementFunction,
      scope: ReducerScope.Node,
      pure: false
    });
  });
  it("throws on invalid reducer", () => {
    expect(() => compileTemplate(SliceName, { [MetaKey]: { reducer: [] as any as ReducerWithDetails } })).toThrow();
  });
  it("throws on invalid template", () => {
    expect(() => compileTemplate(SliceName, true as any as  ISliceTemplate)).toThrow();
  });
  it("converts reducer shorthands to reducer descriptor", () => {
    let i = 0;
    for (const { shorthand, details } of ValidReducerShorthands)
      expect(compileTemplate(SliceName, { [MetaKey]: { reducer: shorthand } }).reducer, "template #" + (++i)).toEqual(details);
  });
});
