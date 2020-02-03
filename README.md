# Redux Slices

[![build status](https://img.shields.io/travis/redux-toolset/slices/master.svg?style=flat-square)](https://travis-ci.org/redux-toolset/slices)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/redux-toolset/slices/issues)

This package is yet another attempt to simplify redux state management for larger applications.
It allows to define comprehensive `state shape descriptors` (`slices`) for individual modules (logical units) of your application.
`Slices` are used to automatically generate action creators and selectors on the module level.
On the application level, `Slices` are combined into a single `state shape tree` that is used to generate reducers and initialize Redux store.

Install via `npm install @redux-toolset/slices` or `yarn add @redux-toolset/slices`

# Warning

This is experimental software, created by a single person learning `react`/`redux`.
It may turn out to be conceptually wrong and there may be better/more correct ways to do the same.
The API may change without notice. Please do not rely on this for production use.
Comments, suggestions, PRs and critique are welcome.

# Features

- application state tree is assembled from modular `slices` pertaining to logical units of the application
- multi-level state trees are supported
- `slice` can be mounted at any node of the state tree, see [Mount points](#mount-points)
- state mutation logic is fully defined in the `slice` descriptor
- strongly typed selectors and action creators are natively supported in Typescript
- ensures uniqueness of action types and state keys across the application (at runtime)
- generates transparent and expressive action names (flattened path to the `action creator`'s `slice node`)
- supports dynamic addressing of state nodes in reducer, see [Resolvers](#resolvers)
- supports direct state mutation in reducers via [immer](https://immerjs.github.io/immer/)
- supports different state scopes for reducers, see [Reducer scopes](#reducer-scopes)
- supports one-to-many, one-to-one and many-to-one relations between actions and reducers, see [Subscriptions](#subscriptions)
- automatically routes actions to the subscribed reducers, avoiding the overhead of invoking every reducer for every action
- merges all `slices` used in the application into a single `state shape tree` to build reducer map consumable by [`combineReducers()`](https://redux.js.org/api/combinereducers)
- merges initial state definitions in individual `slices` into an object that defines initial state for the global state tree, passable to [`createStore()`](https://redux.js.org/api/createstore)
- reduces boilerplate when designing action creators, selectors and reducers
- works with popular Redux tools and middleware ([reselect](https://github.com/reduxjs/reselect), [redux-thunk](https://github.com/reduxjs/redux-thunk), [redux-promise-middleware](https://github.com/pburtchaell/redux-promise-middleware) and others) out of the box.
- strives to conform to the original Redux vision, [concepts](https://redux.js.org/introduction/core-concepts) and [best practices](https://redux.js.org/style-guide/style-guide/)
- footprint is ~ 6 Kb

# Entities

## Slices

- each `slice` is defined and owned by a separate logical unit of the application (module, library, package etc.)
- `slice` is at the root of the tree of `slice nodes`. A `slice` is itself a `slice node`.
- `slice node` describes a single node in the application state tree and may be nested (contained in another `slice node`).
- `slice` has the following properties:
  - `name` - corresponds to the node name in the state tree
  - `initial` - defines initial values for the corresponding node and all its sub-nodes
  - `mountPoint` - path to the node in the state tree where this `slice` is to be mounted. If not specified, this `slice` will be one of the `root slices`
- A `slice node` has the following properties:
  - `reducer` - [reducer descriptor](#reducer-descriptors) for this `slice node`
  - `resolver` - allows to dynamically address state nodes in reducers, see [resolvers](#resolvers)
  - `actions` - an object whose keys correspond to action name and values represent reducer to handle the action, or `undefined` if the action has no corresponding reducer
  - `nodes` - an object whose keys correspond to the sub-node names in the state tree, and values are `slice nodes`
- [action creators](#action-creators) and [selectors](#selectors) are automatically generated from the `slice`, see [`compileSlice()`](#compileslice)

## Templates

- `template` is a concise description of a `slice`
- if `slice` is a machine code, `template` is a source code, for better readability and expressiveness
- it is not necessary to use `templates`, one is free to define slices directly
- `template` is always compiled into a `slice`
- `template` is an object where the meaning of entries depend on the type of the keys
  - if the key is a `string` or a `number`, value describes `slice node` with the same name (and, consequently, node in the `state tree`).
  - if the key is a special symbol `MetaKey`, value describes properties of this `slice node` (that is, `reducer`, `resolver` and `actions`, see above)
- in the absence of `MetaKey`, the following defaults are used for the `slice node`:
  - `reducer` = [`payloadReducer`](#payload-reducer)
  - all other properties are undefined

## Reducer Descriptors

`Reducer Descriptor` is defined as:

```typescript
interface IReducerDetails {
  reducer: Reducer;
  pure: boolean;
  scope: ReducerScope;
  subscribe?: ActionList;
}
```

- `reducer` is a `reducer function` as defined in [Redux documentation](https://redux.js.org/glossary#reducer)
- `pure` is true if reducer is guaranteed to be a [pure function](https://redux.js.org/recipes/structuring-reducers/prerequisite-concepts#pure-functions-and-side-effects).
  If not specified explicitly, and the reducer is a user-defined function, `pure` is assumed to be `false` and the reducer may be wrapped in the [immer's `produce`](https://immerjs.github.io/immer/docs/produce)
- `scope` is one of `ReducerScope.Slice` or `ReducerScope.Node`, see explanation [below](#reducer-scopes)
- `subscribe` allows this reducer to react to action(s) other than the default action for this reducer (see [Action Creators](#action-creators) and [Subscriptions](#subscriptions))

## Reducer Scopes

Reducer scope defines which specific node of the state tree will be passed to the reducer, and is expected to be returned from the reducer.
As `slice nodes` have tree-like structure, reducers may be defined on deeply nested nodes.
Sometimes it may be desired for such reducer to have access to the `slice`'s entire state tree, at other times it is enough to act upon the `slice node`'s branch.
Use `ReducerScope.Node` in the latter case and `ReducerScope.Slice` in the former.

## Payload Reducer

Payload reducer is a defined as:

```typescript
const payloadReducer: IReducerDetails = {
  reducer: (_, action) => action.payload,
  pure: true,
  scope: ReducerScope.Node
};
```

basically it is a setter for a given state node, and the value to be set is taken from the `action`'s payload. Notice that
payload reducer has `ReducerScope.Node` scope, meaning that it receives state traversed to the `slice node` where the reducer is defined.
One special case for payload reducer is when its corresponding action is dispatched with `undefined` payload. In this case,
the node is deleted from the state tree instead of setting it's value in the parent object to `undefined`.

## Example

Given the following state shape:

```typescript
interface IInvoiceItemState {
  name: string;
  quantity: number;
  price: number;
}

interface IInvoiceState {
  date: string;
  items: { [key: string]: IInvoiceItemState }; // key corresponds to the ID of the item
  memo: string;
}

type InvoicesState = { [key: string]: IInvoiceState }; // key corresponds to the ID of the invoice
```

we need:

- actions to add new invoice, update or delete existing invoice by its ID
- actions to add new item in the invoice, update or delete existing item by invoice ID and item ID
- selector to obtain the snapshot of invoices in the state tree
- selector to compute total amount of the invoice

First, we define `template` for our to-be-generated `slice`:

```typescript
const InvoicesTemplate: ISliceTemplate = {
  invoice: {
    [MetaKey]: {
      resolver: (meta: IInvoiceActionMeta) => meta.invoiceId
    },
    items: {
      item: {
        [MetaKey]: {
          resolver: (meta: IInvoiceItemActionMeta) => meta.itemId
        },
        quantity: {}
      }
    },
    memo: {}
  }
};
```

- `MetaKey` is a special symbol that allows to specify properties for a `slice node`. In this case, we use `MetaKey`
  to define [Resolver](#resolvers) for the `invoice` and `invoice.items.item` nodes
- we use two additional types `IInvoiceActionMeta` and `IInvoiceItemActionMeta`, defined as:

```typescript
interface IInvoiceActionMeta {
  invoiceId: string;
}

interface IInvoiceItemActionMeta extends IInvoiceActionMeta {
  itemId: string;
}
```

We will later make use of these types when dispatching actions for specific invoices and items.

The last step before we compile our template is to declare action creators. This step is entirely optional and is needed only for compile-time type checking.

```typescript
type InvoicesAction = ActionCreator<InvoicesState> & {
  invoice: ActionCreator<IInvoiceState | undefined, IInvoiceActionMeta> & {
    items: ActionCreator<
      { [key: string]: IInvoiceItemState },
      IInvoiceItemActionMeta
    > & {
      item: ActionCreator<
        IInvoiceItemState | undefined,
        IInvoiceItemActionMeta
      > & {
        quantity: ActionCreator<number, IInvoiceItemActionMeta>;
      };
    };
    memo: ActionCreator<string, IInvoiceActionMeta>;
  };
};
```

Notice how action creators repeat `slice` inner structure.

Finally, proceed with compilation, generate actions, selector, reducers and create Redux store:

```typescript
const { slice, action, select } = compileSlice<InvoicesState, InvoicesAction>(
  'invoices',
  InvoicesTemplate
);
const { reducers, initial } = buildReducer(mergeSlices([slice]));
const rootReducer = combineReducers(reducers);
const store = createStore(rootReducer, initial);
```

Now we can:

- `store.dispatch(action.invoice({ date: .., items: {...} }, { invoiceId: <replace_by_invoice_id> }));` to add or update an invoice by its ID
- `store.dispatch(action.invoice(undefined, { invoiceId: <replace_by_invoice_id> }));` to remove an invoice by its ID (see special case in [`payloadReducer`](#payload-reducer) description)
- `store.dispatch(action.invoice.items.item({name:...}, { invoiceId: <replace_by_invoice_id>, itemId:<replace_by_item_id> }));` to add or update an invoice item by its ID
- `store.dispatch(action.invoice.items.item(undefined, { invoiceId: <replace_by_invoice_id>, itemId:<replace_by_item_id> }));` to remove an invoice item by its ID
- `select(store.getState)` to obtain `InvoicesState` object
- and we can either dynamically compute total amount of the invoice like this:

```typescript
const selectInvoiceAmount = (getState: any, invoiceId: string) =>
  Object.values(select(getState)[invoiceId]?.items || {}).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
const amount = selectInvoiceAmount(store.getState, '1');
```

- or use [reselect](https://github.com/reduxjs/reselect) to memoize computation (recommended):

```typescript
const selectInvoiceAmount = createSelector(select, invoices =>
  memoize((invoiceId: string) =>
    Object.values(invoices[invoiceId]?.items || {}).reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    )
  )
);
const amount = selectInvoiceAmount(store.getState)('1');
```

See [invoices-example.spec.ts](/tests/invoices-example.spec.ts) for a full example

## Resolvers

In the example above, the nodes `invoice` and `invoice.items.item` need invoice ID and invoice item ID to address respective state entry.
For example, if we have 1 invoice with 2 items, our state tree will look like:

```json
{
  "invoices": {
    "1": {
      "date": "2000-1-1",
      "items": {
        "1": {
          "name": "pen",
          "quantity": 1,
          "price": 0.5
        },
        "2": {
          "name": "pencil",
          "quantity": 2,
          "price": 0.3
        }
      }
    }
  }
}
```

This poses no problem for the `ReducerScope.Slice` reducers. However, state traversal for the `ReducerScope.Node` reducer defined,
for example, at the level of the invoice item, requires both invoice ID and invoice item ID, and a way to extract these IDs from the `action`.
Resolvers serve this purpose exactly. They take `action.meta` as a parameter and return value to be used as index in the state object on the level where the resolver is defined.
So if we want to change the second item's quantity in the first invoice from 2 to 3, we can do:

```typescript
store.dispatch(
  action.invoice.items.item.quantity(3, { invoiceId: 1, itemId: 2 })
);
```

## Action Creators

`Action creator` is basically a function that returns an action with a pre-defined `type`, and other properties (`payload`, `meta`, `error`) passed as action creator's arguments.
Action creators are automatically generated for each `slice node`, and action `type` is computed as a flattened path to that `slice node`.
Our definition of action creator is very similar to the [Redux Action Creator](https://redux.js.org/glossary#action-creator) with the following additions:

- action's `type` is always a flattened path to the `slice node` corresponding to the `action creator`.
- `action creator`'s `toString()` method returns action's `type`
- action creator is a function, but is also an object with keys mapping nested action creators.
  This may seem like a poor design decision (and indeed it may be), but it produces expressive and readable action references.
  There is a side effect: `action creators` should not have names overlapping standard properties defined for the Javascript `function` object:
  `length`, `name`, `apply`, `arguments`, `bind`, `call`, `caller`, `constructor`, `toString`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`, `valueOf`.
  One of the possible ways to work around this issue is to prefix generated action creators with a fixed symbol (for example, an underscore - '\_') if the name clash is detected.
  This is currently being considered, along with the other possible workarounds. For now it is advised to avoid the mentioned names.

In the example above, the following action creators are generated:

```typescript
action.invoices(payload:InvoicesState); // creates action {type:'invoices', payload}
action.invoices.invoice(payload:IInvoiceState|undefined, meta:IInvoiceActionMeta); // creates action {type:'invoices/invoice', payload, meta}
action.invoices.invoice.memo(payload:string, meta:IInvoiceActionMeta); // creates action {type:'invoices/invoice/memo', payload, meta}
action.invoices.invoice.items(payload:{ [key: string]: IInvoiceItemState }, meta:IInvoiceActionMeta); // creates action {type:'invoices/invoice/items', payload, meta}
action.invoices.invoice.items.item(payload:IInvoiceItemState|undefined, meta:IInvoiceItemActionMeta); // creates action {type:'invoices/invoice/items/item', payload, meta}
action.invoices.invoice.items.item.quantity(payload:number, meta:IInvoiceItemActionMeta); // creates action {type:'invoices/invoice/items/item/quantity', payload, meta}
```

## Subscriptions

Redux encourages to avoid one-to-one mapping between reducers and actions, (see [this](#https://redux.js.org/faq/actions#is-there-always-a-one-to-one-mapping-between-reducers-and-actions), for example).
Naturally, an `action` should not be viewed as a simple setter for a node in the state tree. An `action` is rather an `event` that may be handled by one or many reducers to change respective
parts of the state tree. It may also not be handled by any reducer at all. Original Redux implementation simply forwards every action to every reducer, and it is up to the reducer to decide how
to handle or ignore the action. Slightly different approach is suggetsed here. By default, every action generated for the `slice node` is 1-to-1 mapped to the [Payload reducer](#payload-reducer),
and the latter acts as a simple setter. But if the `reducer function` is specified explicitly in the [Reducer descriptor](#reducer-descriptors), we can subscribe it to actions pertaining to any `slice`,
or actions that aren't related to slices at all.
Just need to add action types to the `subscribe` array in the [Reducer descriptor](#reducer-descriptors).
Additionally, we can define extra action creators that have no direct relationship to to the state tree at any level of the `slice` using the `sliceNode.actions` field.

## Selectors

`Selector` is a function that receives the snapshot of the entire state tree and returns the part of the state pertaining to the `slice`. `Selector` function is generated by [`compileSlice()`](#compileslice).
if function is passed to the `Selector`, it will call that function with any extra arguments passed to the `Selector` function.
For example, `select(store.getState())` and `select(store.getState)` yields the same result.

## Mount Points

`Slices` have an optional `mountPoint` property that allows to associate the `slice` with arbitrary node of the application state tree.
The most common use case it to group different slices under a single parent that is persisted across web page reloads, while the rest of the state tree is re-created from default on every reload.

# API

## Primary functions

### `compileSlice():`

```typescript
function compileSlice<S, A = ActionCreatorNode>(
  name: StateNodeName,
  template: ISliceTemplate,
  initial?: S,
  mountPoint?: StateNodePath
): {
  slice: ISlice<S>;
  select: Selector<S>;
  action: A;
};
```

Compiles [Template](#templates) and returns:

- compiled `slice` (see [Slices](#slices)),
- generated `selector` for this `slice` (see [Selectors](#selectors)),
- generated `action creators` for this slice (see [Action creators](#action-creators))
  This function should be used on the module level. Compiled `slice` may be exported from the module and merged with other `slices` when the Redux store is created.  
  This function takes 2 steps: first, it calls [`compileTemplate()`](#compiletemplate), and then [`generateSelectorAndActions()`](#generateselectorandactions).

### `generateReducers():`

```typescript
function generateReducers(
  slices: Array<ISlice>,
  options: IBuildOptions = defaultBuildOptions
): {
  reducers: ReducersMapObject;
  initial: any;
};
```

Merges `slices` and generates:

- map of reducers to be passed to [`combineReducers()`](https://redux.js.org/api/combinereducers)
- initial state tree that is a merger of `slices'` initial states. Maybe be passed as the second argument to [`createStore()`](https://redux.js.org/api/createstore)

This function is used on the application level, right before the Redux store is created.  
This function takes 2 steps: first, it calls [`mergeSlices()`](#mergeslices), and then [`buildReducers()`](#buildreducers).

The optional `options` parameter is defined as:

```typescript
interface IBuildOptions {
  /**
   * wrap impure reducers with immer.produce()
   */
  immer?: boolean;
}

const defaultBuildOptions: IBuildOptions = {
  immer: true
};
```

## Auxiliary functions

### `compileTemplate():`

```typescript
function compileTemplate<S>(
  name: StateNodeName,
  template: ISliceTemplate,
  initial?: S,
  mountPoint?: StateNodePath
): ISlice<S>;
```

Compiles [Template](#templates) and returns compiled `slice` (see [Slices](#slices)).
Consider using [`compileSlice()`](#compileslice) instead.

### `generateSelectorAndActions():`

```typescript
function generateSelectorAndActions<S, A = ActionCreatorNode>(
  slice: ISlice<S>
): {
  select: Selector<S>;
  action: A;
};
```

Generates `selector` (see [Selectors](#selectors)) and `action creators` for this slice (see [Action creators](#action-creators)).
Consider using [`compileSlice()`](#compileslice) instead.

### `mergeSlices():`

```typescript
function mergeSlices(slices: Array<ISlice>): IStateShape;
```

Merges provided `slices` into a single tree describing the shape of the entire state tree.
The output of this function is consumed by [`buildReducers()`](#buildreducers), but may also be used to visualize the entire state shape during debugging.
Consider using [`generateReducers()`](#generatereducers) instead.

### `buildReducers()`:

```typescript
export function buildReducers(
  root: IStateShape,
  options: IBuildOptions = defaultBuildOptions
): {
  reducers: ReducersMapObject;
  initial: any;
};
```

Takes `state shape descriptor` built from individual `slices` and generates:

- map of reducers to be passed to [`combineReducers()`](https://redux.js.org/api/combinereducers)
- initial state tree that is a merger of every `slice`'s initial state. Should be passed to [`createStore()`](https://redux.js.org/api/createstore)
  Consider using [`generateReducers()`](#generatereducers) instead.
