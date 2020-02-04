import { ActionCreatorNode, getSegments, newActionCreator } from "./actions";
import { error, isObject, resolveFunction } from "./utils";
import { IReducerDetails } from "./reducers";

export type StateNodeName = string | number;
export type StateNodePath = Array<StateNodeName>;
export type StateNodeNameResolver = (meta: any) => StateNodeName;
export type Selector<S> = (state: any, ...args: any[]) => S;
export type SliceNodeMap = { [key in StateNodeName]: ISliceNode };
export type SliceActions = { [key: string]: IReducerDetails | undefined };

export interface ISliceTree {
  /**
   * child nodes
   */
  readonly nodes?: SliceNodeMap;
  /**
   * reducer for this node's default action.
   * if not specified, payload reducer is used
   */
  readonly reducer: IReducerDetails;
  /**
   * additional actions for this node
   */
  readonly actions?: SliceActions;
}

export interface ISliceNode extends ISliceTree {
  /**
   * returns state node name for dynamic nodes
   */
  readonly resolver?: StateNodeNameResolver;
}

export interface ISlice<S = any> extends ISliceTree {
  /**
   * name of this slice
   */
  readonly name: StateNodeName;
  /**
   * initial state for this slice
   */
  readonly initial?: S;
  /**
   * path to this slice in the application state tree.
   */
  readonly mountPoint?: StateNodePath;
}

function assign(obj: any, name: string, value: any) {
  for (; ;) {
    const descr=Object.getOwnPropertyDescriptor(obj, name);
    if (!descr || descr.writable) {
      obj[name] = value;
      // this check is probably unnecessary, but extra caution doesn't hurt
      if (obj[name] === value) break;
    }
    name = name + "_";
  }
  return value;
}

function createActions(
  parentAction: ActionCreatorNode,
  nodes?: SliceNodeMap,
  actions?: SliceActions
) {
  if (nodes)
    for (const [name, node] of Object.entries(nodes)) {
      const action = (assign(parentAction, name, newActionCreator([
        ...getSegments(parentAction),
        name
      ])));
      createActions(action, node.nodes, node.actions);
    }
  if (actions)
    for (const name of Object.keys(actions))
      assign(parentAction, name, newActionCreator([
        ...getSegments(parentAction),
        name
      ]));
}

export function generateSelectorAndActions<S, A = ActionCreatorNode>(
  slice: ISlice<S>
): {
  select: Selector<S>;
  action: A;
} {
  const path = [...(slice.mountPoint || []), slice.name as string];
  const select: Selector<S> = (state, ...args) => {
    state = resolveFunction(state, ...args);
    for (const n of path) {
      if (!isObject(state)) return slice.initial;
      state = state[n];
    }
    return state === undefined ? slice.initial : state;
  };
  const action = newActionCreator(path);
  createActions(action, slice.nodes);
  return { select, action: (action as any) as A };
}

type StateShapeMap = { [key in StateNodeName]: IStateShape };

export interface IStateShape {
  slice?: ISlice;
  children?: StateShapeMap;
  level: number;
}

function getOrAddNode(parent: IStateShape, path?: StateNodePath) {
  if (path)
    for (const name of path) {
      const children = parent.children || (parent.children = {});
      parent = children[name] || (children[name] = { level: parent.level + 1 });
    }
  return parent;
}

export function mergeSlices(slices: Array<ISlice>): IStateShape {
  const root: IStateShape = { level: 0 };
  for (const slice of slices) {
    const { name, mountPoint } = slice;
    const node = getOrAddNode(root, mountPoint);
    const existing = node.children && node.children[name];
    if (existing)
      if (existing.slice === slice) continue;
      else error(`duplicate slices ${name} @ [/${mountPoint?.join("/")}]`);
    const children = node.children || (node.children = {});
    children[name] = { slice, level: node.level + 1 };
  }
  return root;
}
