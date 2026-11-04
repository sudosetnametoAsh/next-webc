"use client";

import { Children, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

// Keep each popup's deadline stable when other notifications arrive or disappear.
export function useNotificationPopupTimeout(
  popups: { id: string }[],
  onExpire: (id: string) => void,
) {
  const deadlines = useRef(new Map<string, number>());
  useEffect(() => {
    const ids = new Set(popups.map((popup) => popup.id));
    for (const id of deadlines.current.keys()) {
      if (!ids.has(id)) deadlines.current.delete(id);
    }
    const timers = popups.map(({ id }) => {
      const deadline = deadlines.current.get(id) ?? Date.now() + 3000;
      deadlines.current.set(id, deadline);
      return setTimeout(() => onExpire(id), Math.max(0, deadline - Date.now()));
    });
    return () => timers.forEach(clearTimeout);
  }, [popups, onExpire]);
}

export function AnimatedNotificationPopups({ children, className }: {
  children: ReactNode;
  className: string;
}) {
  const incoming = Children.toArray(children) as ReactElement[];
  const [previous, setPrevious] = useState(children);
  const [items, setItems] = useState(() => incoming.map((element) => ({ element, exiting: false })));

  if (previous !== children) {
    setPrevious(children);
    const keys = new Set(incoming.map((element) => element.key));
    setItems([
      ...incoming.map((element) => ({ element, exiting: false })),
      ...items.filter(({ element }) => !keys.has(element.key)).map((item) => ({ ...item, exiting: true })),
    ]);
  }

  // Also clean up if animation events are unavailable or motion is disabled.
  useEffect(() => {
    if (!items.some((item) => item.exiting)) return;
    const timer = setTimeout(() => setItems((current) => current.filter((item) => !item.exiting)), 150);
    return () => clearTimeout(timer);
  }, [items]);

  return (
    <div className={className}>
      {items.map(({ element, exiting }) => (
        <div
          key={element.key}
          className={exiting
            ? "animate-out fade-out slide-out-to-top-2 pointer-events-none motion-reduce:transform-none"
            : "animate-in fade-in slide-in-from-top-2 motion-reduce:transform-none"}
          aria-hidden={exiting || undefined}
          inert={exiting || undefined}
          onAnimationEnd={(event) => {
            if (exiting && event.target === event.currentTarget) {
              setItems((current) => current.filter((item) => item.element.key !== element.key));
            }
          }}
        >
          {element}
        </div>
      ))}
    </div>
  );
}
