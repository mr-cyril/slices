import { Action } from 'redux';
import { error } from './utils';

declare module 'redux' {
  export interface Action {
    payload?: any;
    meta?: any;
    error?: boolean;
  }
}

interface ActionCreatorFn<P = any, M = any> {
  (payload: P, meta?: M, error?: boolean): Action;
}

const SegmentsKey = Symbol();
export type ActionTypeSegments = Array<string | number>;
export type ActionCreator<P = any, M = any> = ActionCreatorFn<P, M> & {
  [SegmentsKey]: ActionTypeSegments;
};

export interface ActionCreatorNode extends ActionCreator {
  [key: string]: ActionCreatorNode;
}

export function newActionCreator(
  typeSegments: ActionTypeSegments
): ActionCreatorNode {
  if (!Array.isArray(typeSegments) || !typeSegments.length)
    error(
      'invalid action creator type segments: ' + JSON.stringify(typeSegments)
    );
  const type = typeSegments.join('/');
  const creator: ActionCreatorFn = (payload, meta, error) => ({
    type,
    payload,
    meta,
    error
  });
  creator.toString = () => type;
  (creator as ActionCreator)[SegmentsKey] = typeSegments;
  return creator as ActionCreatorNode;
}

export function getSegments(a: ActionCreator) {
  return a[SegmentsKey];
}
