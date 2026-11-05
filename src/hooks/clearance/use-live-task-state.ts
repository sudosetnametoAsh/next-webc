'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

/** Local submission feedback, with incoming server changes visible in the same render. */
export function useLiveTaskState<T>(source: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState({ source, value: source });
  if (state.source !== source) setState({ source, value: source });
  const value = state.source === source ? state.value : source;
  const update: Dispatch<SetStateAction<T>> = action => setState(previous => {
    const current = previous.source === source ? previous.value : source;
    return { source, value: typeof action === 'function' ? (action as (value: T) => T)(current) : action };
  });
  return [value, update];
}
