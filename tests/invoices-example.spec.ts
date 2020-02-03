import {
  MetaKey,
  ISliceTemplate,
  ActionCreator,
  compileSlice,
  generateReducers
} from "../src";
import { combineReducers, createStore } from "redux";
import { createSelector } from "reselect";
import memoize from "lodash/memoize";

interface IInvoiceItemState {
  name: string;
  quantity: number;
  price: number;
}

interface IInvoiceState {
  date: string;
  items: { [key: string]: IInvoiceItemState } // key corresponds to the ID of the item
  memo?: string;
}

type InvoicesState = { [key: string]: IInvoiceState }; // key corresponds to the ID of the invoice

interface IInvoiceActionMeta {
  invoiceId: string,
}

interface IInvoiceItemActionMeta extends IInvoiceActionMeta {
  itemId: string,
}

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

type InvoicesAction = ActionCreator<InvoicesState> & {
  invoice: ActionCreator<IInvoiceState | undefined, IInvoiceActionMeta> & {
    items: ActionCreator<{ [key: string]: IInvoiceItemState }, IInvoiceItemActionMeta> & {
      item: ActionCreator<IInvoiceItemState | undefined, IInvoiceItemActionMeta> & {
        quantity: ActionCreator<number, IInvoiceItemActionMeta>
      }
    }
    memo: ActionCreator<string, IInvoiceActionMeta>
  }
}


describe("simple invoice example", () => {
  const { slice, action, select } = compileSlice<InvoicesState, InvoicesAction>("invoices", InvoicesTemplate);
  const { reducers, initial } = generateReducers([slice]);
  const rootReducer = combineReducers(reducers);
  const store = createStore(rootReducer, initial);
  const selectInvoiceAmount = createSelector(select, invoices => memoize((invoiceId: string) => Object.values(invoices[invoiceId]?.items || {}).reduce((acc, item) => acc + item.price * item.quantity, 0)));
  const selectInvoiceAmountNoMemoize = (getState: any, invoiceId: string) => Object.values(select(getState)[invoiceId]?.items || {}).reduce((acc, item) => acc + item.price * item.quantity, 0);
  test("add invoice #1 with item #1", () => {
    store.dispatch(action.invoice({
      date: "2000-1-1",
      items: { 1: { name: "pen", quantity: 1, price: 0.5 } }
    }, { invoiceId: "1" }));
    const invoices = select(store.getState);
    expect(invoices[1].date).toEqual("2000-1-1");
    expect(Object.keys(invoices[1].items)).toEqual(["1"]);
  });
  test("add item #2 to invoice #1", () => {
    store.dispatch(action.invoice.items.item({ name: "pencil", quantity: 2, price: 0.3 }, {
      invoiceId: "1",
      itemId: "2"
    }));
    const invoices = select(store.getState);
    expect(Object.keys(invoices[1].items)).toEqual(["1", "2"]);
  });
  test("compute invoice amount", () => {
    const amount = 0.5 * 1 + 2 * 0.3;
    expect(selectInvoiceAmount(store.getState)("1")).toEqual(amount);
    expect(selectInvoiceAmountNoMemoize(store.getState, "1")).toEqual(amount);

  });
  test("set invoice #1 memo", () => {
    const memo = "new memo";
    store.dispatch(action.invoice.memo(memo, { invoiceId: "1" }));
    const invoices = select(store.getState);
    expect(invoices[1].memo).toEqual(memo);

  });
  test("change quantity of item #2 in invoice #1", () => {
    store.dispatch(action.invoice.items.item.quantity(3, { invoiceId: "1", itemId: "2" }));
    const invoices = select(store.getState);
    expect(invoices[1].items[2].quantity).toEqual(3);

  });
  test("remove invoice #1", () => {
    store.dispatch(action.invoice(undefined, { invoiceId: "1" }));
    const invoices = select(store.getState);
    expect(Object.keys(invoices).length).toEqual(0);
  });
});