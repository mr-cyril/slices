import { ActionCreatorNode } from './actions';
import { compileTemplate, ISliceTemplate } from './template';
import {
  generateSelectorAndActions,
  ISlice,
  mergeSlices,
  Selector,
  StateNodeName,
  StateNodePath
} from './slices';
import { ReducersMapObject } from 'redux';
import { buildReducers, defaultBuildOptions, IBuildOptions } from './reducers';

export { ActionCreator } from './actions';
export { compileTemplate, MetaKey, ISliceTemplate } from './template';
export {
  generateSelectorAndActions,
  mergeSlices,
  Selector,
  ISlice
} from './slices';
export { buildReducers, ReducerScope } from './reducers';

export function compileSlice<S, A = ActionCreatorNode>(
  name: StateNodeName,
  template: ISliceTemplate,
  initial?: S,
  mountPoint?: StateNodePath
): {
  slice: ISlice<S>;
  select: Selector<S>;
  action: A;
} {
  const slice = compileTemplate(name, template, initial, mountPoint);
  return { ...generateSelectorAndActions<S, A>(slice), slice };
}

export function generateReducers(
  slices: Array<ISlice>,
  options: IBuildOptions = defaultBuildOptions
): {
  reducers: ReducersMapObject;
  initial: any;
} {
  return buildReducers(mergeSlices(slices), options);
}
