export default function ListsLoading() {
  return (
    <div className="px-4 pt-4 pb-24 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-24 rounded bg-gray-100" />
      </div>

      {/* List card skeletons */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
