export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Default page-level placeholder: a title bar plus a few card-shaped blocks. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
