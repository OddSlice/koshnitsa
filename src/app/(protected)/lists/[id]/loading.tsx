export default function ListDetailLoading() {
  return (
    <div className="px-4 pt-4 pb-36 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-6 w-36 rounded bg-gray-200" />
          <div className="mt-1 h-3 w-20 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-16 rounded-lg bg-gray-200" />
        <div className="h-9 w-16 rounded-lg bg-gray-200" />
      </div>

      {/* Item skeletons */}
      <div className="flex flex-col gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5"
          >
            <div className="h-5 w-5 rounded border-2 border-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
