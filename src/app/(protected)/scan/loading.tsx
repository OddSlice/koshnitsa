export default function ScanLoading() {
  return (
    <div className="px-4 pt-4 pb-24 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-5">
        <div className="h-7 w-20 rounded bg-gray-200" />
        <div className="mt-1 h-4 w-48 rounded bg-gray-100" />
      </div>

      {/* Camera area skeleton */}
      <div className="aspect-square w-full rounded-2xl bg-gray-200" />

      {/* Button skeleton */}
      <div className="mt-4 h-12 w-full rounded-xl bg-gray-200" />
    </div>
  );
}
