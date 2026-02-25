export default function DealsLoading() {
  return (
    <div className="px-4 pt-4 pb-24 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-5">
        <div className="h-7 w-20 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-52 rounded bg-gray-100" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-5 h-12 rounded-xl bg-gray-200" />

      {/* Content skeleton */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10">
        <div className="mb-3 h-10 w-10 rounded-full bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-100" />
      </div>
    </div>
  );
}
