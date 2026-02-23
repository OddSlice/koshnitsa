"use client";

import Link from "next/link";

interface SnapshotItem {
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
}

interface Snapshot {
  id: string;
  list_name: string;
  store_name: string | null;
  completed_at: string;
  items: SnapshotItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function HistoryClient({
  snapshots,
}: {
  snapshots: Snapshot[];
}) {
  return (
    <div className="px-4 pt-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-500">Your completed shopping trips</p>
      </header>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mb-3 text-4xl">📋</div>
          <h2 className="mb-1 text-lg font-semibold text-gray-800">
            No trips yet
          </h2>
          <p className="text-sm text-gray-500">
            Complete a shopping trip to see it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {snapshots.map((snap) => {
            const items = snap.items as SnapshotItem[];
            const checkedCount = items.filter((i) => i.is_checked).length;
            const totalCount = items.length;

            return (
              <Link
                key={snap.id}
                href={`/history/${snap.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md active:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {snap.list_name}
                    </h3>
                    {snap.store_name && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {snap.store_name}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(snap.completed_at)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {checkedCount}/{totalCount}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
