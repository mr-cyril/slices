import { Action, Reducer, ReducersMapObject } from 'redux';
import {
  ISliceNode,
  IStateShape,
  StateNodeName,
  StateNodeNameResolver,
  StateNodePath
} from './slices';
import { ActionCreator, ActionTypeSegments, getSegments } from './actions';
import produce, { Draft } from 'immer';
import { error } from './utils';

export enum ReducerScope {
  Slice = 'slice',
  Node = 'node'
}

export type ActionRef = string | ActionCreator;
export type ActionList = ActionRef | Array<ActionRef>;

export interface IReducerDetails {
  reducer: Reducer;
  pure: boolean;
  scope: ReducerScope;
  subscribe?: ActionList;
}

export interface IBuildOptions {
  /**
   * wrap impure reducers with immer.produce()
   */
  immer?: boolean;
}

export const defaultBuildOptions: IBuildOptions = {
  immer: true
};

export const payloadReducer: IReducerDetails = {
  reducer: (_, action) => action.payload,
  pure: true,
  scope: ReducerScope.Node
};

export function buildReducers(
  root: IStateShape,
  options: IBuildOptions = defaultBuildOptions
): {
  reducers: ReducersMapObject;
  initial: any;
} {
  interface IStateNode {
    name: StateNodeName;
    resolver?: StateNodeNameResolver;
  }

  const reducerMap: { [key: string]: { [key: string]: Array<Reducer> } } = {};
  const initial: any = {};

  function addReducer(
    top: StateNodeName,
    actionSegments: ActionTypeSegments,
    reducer: Reducer
  ) {
    const byActionMap = reducerMap[top] || (reducerMap[top] = {});
    const actionType = actionSegments.join('/');
    const list = byActionMap[actionType] || (byActionMap[actionType] = []);
    if (!list.includes(reducer)) list.push(reducer); // probably impossible, but better safe than sorry
  }

  function createScopedReducer(
    path: Array<IStateNode>,
    reducer: Reducer
  ): Reducer<any, Action> {
    return (state, action) => {
      const address: Array<StateNodeName> = path.map(n =>
        n.resolver ? n.resolver(action.meta) : n.name
      );
      const name: StateNodeName = address.pop()!;
      let initialState = initial;
      let scopedState = state;
      for (const n of address) {
        initialState = initialState[n] || {};
        scopedState = (scopedState && scopedState[n]) || initialState;
      }
      if ((scopedState = scopedState[name]) === undefined)
        scopedState = initialState[name];
      const nextScopedState = reducer(scopedState, action);
      if (nextScopedState === scopedState) return state; // reducer didn't change a thing
      let newState = (scopedState = { ...state });
      for (const n of address)
        scopedState = scopedState[n] = { ...(scopedState[n] || {}) };
      if (nextScopedState !== undefined) scopedState[name] = nextScopedState;
      else if (reducer === payloadReducer.reducer) delete scopedState[name];
      return newState;
    };
  }

  function createReducer(
    path: Array<IStateNode>,
    sliceLevel: number,
    reducerDetails: IReducerDetails,
    actionName?: string
  ) {
    const actionSegments = path.map(n => n.name);
    if (actionName) actionSegments.push(actionName);
    const { scope, subscribe, pure } = reducerDetails;
    let [top, ...rest] = path;
    if (rest.length && scope === ReducerScope.Slice)
      rest = rest.slice(0, sliceLevel - 1);
    const reducer: Reducer =
      options.immer && !pure
        ? (state, action) =>
            produce(state, (draft: Draft<any>) =>
              reducerDetails.reducer(draft, action)
            )
        : reducerDetails.reducer;
    const scopedReducer = rest.length
      ? createScopedReducer(rest, reducer)
      : reducer;
    addReducer(top.name, actionSegments, scopedReducer);
    if (subscribe)
      for (const a of Array.isArray(subscribe) ? subscribe : [subscribe]) {
        const segments = typeof a === 'string' ? [a] : getSegments(a);
        if (!segments)
          error(
            'invalid action reference, must be either action type name or action creator'
          );
        addReducer(top.name, segments, scopedReducer);
      }
  }

  function walk(shapeNode: IStateShape, path: StateNodePath, initial: any) {
    function walkSlice(slice: ISliceNode, path: Array<IStateNode>) {
      if (slice.nodes)
        for (const [name, node] of Object.entries(slice.nodes))
          walkSlice(node, [...path, { name, resolver: node.resolver }]);
      createReducer(path, shapeNode.level, slice.reducer);
      if (slice.actions)
        for (const [name, reducer] of Object.entries(slice.actions))
          if (reducer) createReducer(path, shapeNode.level, reducer, name);
    }

    const { slice, children } = shapeNode;
    if (slice)
      walkSlice(
        slice,
        path.map(name => ({ name }))
      );

    if (children)
      for (const [name, child] of Object.entries(children))
        walk(
          child,
          [...path, name],
          initial[name] || (initial[name] = child.slice?.initial || {})
        );
  }

  walk(root, [], initial);

  let reducers: ReducersMapObject = {};

  if (
    root.children &&
    Object.keys(root.children).length &&
    Object.keys(reducerMap).length
  )
    for (const [name] of Object.entries(root.children)) {
      reducers[name] = (state = initial[name], action) => {
        const caseReducers = reducerMap[name][action.type];
        if (caseReducers && caseReducers.length) {
          let newState = state;
          for (const reducer of caseReducers)
            newState = reducer(newState, action);
          return newState;
        }
        return state;
      };
    }
  return { reducers, initial };
}
