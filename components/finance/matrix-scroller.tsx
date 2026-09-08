"use client";

import { useEffect, useRef } from "react";

/**
 * The collection grid runs oldest → newest, but the months people actually
 * care about are the recent ones at the right edge, so it opens scrolled there.
 */
export function MatrixScroller({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
