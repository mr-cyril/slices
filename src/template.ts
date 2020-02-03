import { error, isFunction, isObject } from './utils';
import { Reducer } from 'redux';
import {
  ISlice,
  ISliceNode,
  SliceActions,
  SliceNodeMap,
  StateNodeName,
  StateNodeNameResolver,
  StateNodePath
} from './slices';
import {
  ActionList,
  IReducerDetails,
  payloadReducer,
  ReducerScope
} from './reducers';

export const MetaKey = Symbol();
export type ReducerWithDetails =
  | Reducer
  | [Reducer, ReducerScope]
  | [Reducer, ActionList]
  | IReducerDetails
  | undefined;

interface ISliceMeta {
  readonly reducer?: ReducerWithDetails;
  readonly actions?: { [key: string]: ReducerWithDetails };
  readonly resolver?: StateNodeNameResolver;
}

export interface ISliceTemplate {
  [key: string]: ISliceTemplate;

  [key: number]: ISliceTemplate;

  [MetaKey]?: ISliceMeta;
}

function toReducerDetails(
  r: ReducerWithDetails,
  defaultScope?: ReducerScope
): IReducerDetails {
  if (r === undefined) return payloadReducer;
  if (Array.isArray(r) && r.length === 2) {
    const [reducer, second] = r;
    if (second === ReducerScope.Node || second === ReducerScope.Slice)
      return { reducer, pure: false, scope: second };
    return {
      reducer,
      pure: false,
      scope: defaultScope || ReducerScope.Slice,
      subscribe: second
    };
  }
  if (isFunction(r))
    return {
      reducer: r as Reducer,
      pure: false,
      scope: defaultScope || ReducerScope.Slice
    };
  if (isFunction((r as IReducerDetails).reducer)) return r as IReducerDetails;
  error('invalid reducer: ' + JSON.stringify(r));
}

export function compileTemplate<S>(
  name: StateNodeName,
  template: ISliceTemplate,
  initial?: S,
  mountPoint?: StateNodePath
): ISlice<S> {
  function walk(t: ISliceTemplate): ISliceNode {
    let nodes: SliceNodeMap | undefined = undefined;
    let reducer: IReducerDetails;
    let actions: SliceActions | undefined;
    let resolver: StateNodeNameResolver | undefined;
    if (isObject(t)) {
      const meta = t[MetaKey];
      if (meta) {
        if (meta.actions)
          actions = Object.entries(meta.actions).reduce(
            (map, [name, reducer]) => {
              map[name] =
                reducer === undefined
                  ? undefined
                  : toReducerDetails(reducer, ReducerScope.Node);
              return map;
            },
            {} as SliceActions
          );
        reducer = toReducerDetails(meta.reducer);
        resolver = meta.resolver;
      } else reducer = payloadReducer;
      for (const [name, node] of Object.entries(t)) {
        if (!nodes) nodes = {};
        nodes[name] = walk(node);
      }
    } else error('invalid template entry ' + t.toString());
    return { nodes, reducer, actions, resolver };
  }

  return {
    name,
    initial,
    mountPoint,
    ...walk(template)
  };
}
