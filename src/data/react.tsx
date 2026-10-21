import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { Action } from '../shared/actions.ts';
import type { AppState } from '../shared/types.ts';
import type { DataStore } from './store.ts';

const StoreContext = createContext<DataStore | null>(null);

export function StoreProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): DataStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

/** The whole AppState. Re-renders on every change. */
export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}

/** dispatch(action). Returns a promise that rejects when the server refuses the action. */
export function useDispatch(): (action: Action) => Promise<void> {
  const store = useStore();
  return useCallback((action: Action) => store.dispatch(action), [store]);
}
