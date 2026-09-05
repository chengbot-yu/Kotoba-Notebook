import { useSyncExternalStore } from 'react';
import { Store } from './lib/store';

/** subscribe the component tree to Store mutations */
export function useStoreVersion(): number {
  return useSyncExternalStore(
    cb => {
      Store.onChange(cb);
      return () => {
        // listeners are never removed (they are cheap); app lifetime == page lifetime
      };
    },
    () => Store.version,
  );
}
