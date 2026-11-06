export function BoardSkeleton() {
  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8" aria-busy="true">
      <div className="h-[480px] rounded-2xl border border-line bg-card lg:order-2" />
      <div className="h-[720px] rounded-2xl border border-line bg-card lg:order-1" />
    </div>
  );
}
