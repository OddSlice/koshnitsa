"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SnapshotItem {
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
}

interface SnapshotData {
  id: string;
  listName: string;
  storeName: string | null;
  completedAt: string;
  items: SnapshotItem[];
}

const CATEGORY_ORDER = [
  "Плодове и зеленчуци",
  "Месо и риба",
  "Мляко и яйца",
  "Хляб и тестени",
  "Замразени",
  "Почистване",
  "Лични грижи",
  "Друго",
];

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TripDetailClient({
  snapshot,
  userId,
}: {
  snapshot: SnapshotData;
  userId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const checkedItems = snapshot.items.filter((i) => i.is_checked);
  const uncheckedItems = snapshot.items.filter((i) => !i.is_checked);

  // Group all items by category for display
  function groupByCategory(items: SnapshotItem[]) {
    const groups: { category: string; items: SnapshotItem[] }[] = [];

    for (const cat of CATEGORY_ORDER) {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length > 0) {
        groups.push({ category: cat, items: catItems });
      }
    }

    const other = items.filter((i) => !CATEGORY_ORDER.includes(i.category));
    if (other.length > 0) {
      groups.push({ category: "Other", items: other });
    }

    return groups;
  }

  const uncheckedGrouped = groupByCategory(uncheckedItems);
  const checkedGrouped = groupByCategory(checkedItems);

  async function handleReuse() {
    setLoading(true);
    setError(null);

    // Create a new list with the same name
    const { data: newList, error: listError } = await supabase
      .from("lists")
      .insert({
        name: snapshot.listName,
        created_by: userId,
      })
      .select()
      .single();

    if (listError || !newList) {
      setError(listError?.message ?? "Failed to create list.");
      setLoading(false);
      return;
    }

    // Add creator as member
    const { error: memberError } = await supabase
      .from("list_members")
      .insert({ list_id: newList.id, user_id: userId });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    // Add all items (unchecked)
    const itemsToInsert = snapshot.items.map((item) => ({
      list_id: newList.id,
      added_by: userId,
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      category: item.category,
      is_checked: false,
    }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from("list_items")
        .insert(itemsToInsert);

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/lists/${newList.id}`);
    router.refresh();
  }

  return (
    <div className="px-4 pt-4 pb-28">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/history"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300"
        >
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {snapshot.listName}
          </h1>
          <p className="text-xs text-gray-500">
            {formatFullDate(snapshot.completedAt)}
            {snapshot.storeName && ` \u00B7 ${snapshot.storeName}`}
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-white p-3 border border-gray-200">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500"
            style={{
              width: `${
                snapshot.items.length > 0
                  ? (checkedItems.length / snapshot.items.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium text-gray-600">
          {checkedItems.length}/{snapshot.items.length} checked
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-5">
        {/* Unchecked items (were not completed) */}
        {uncheckedGrouped.length > 0 && (
          <>
            {uncheckedGrouped.map(({ category, items }) => (
              <div key={`unchecked-${category}`}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {category}
                </h2>
                <div className="flex flex-col gap-1">
                  {items.map((item, idx) => (
                    <div
                      key={`${category}-${idx}`}
                      className="flex items-start gap-3 rounded-lg bg-white px-3 py-2.5"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {item.name}
                          </span>
                          {item.quantity && item.quantity !== "1x" && (
                            <span className="shrink-0 text-xs text-gray-500">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Checked items */}
        {checkedGrouped.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Completed ({checkedItems.length})
            </h2>
            <div className="flex flex-col gap-1">
              {checkedItems.map((item, idx) => (
                <div
                  key={`checked-${idx}`}
                  className="flex items-start gap-3 rounded-lg bg-white px-3 py-2.5 opacity-50"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-green-600 bg-green-600">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-400 line-through">
                        {item.name}
                      </span>
                      {item.quantity && item.quantity !== "1x" && (
                        <span className="shrink-0 text-xs text-gray-400">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                    {item.note && (
                      <p className="mt-0.5 text-xs text-gray-300">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reuse button */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
        <div className="mx-auto max-w-lg">
          {error && (
            <p className="mb-2 text-center text-sm text-red-600">{error}</p>
          )}
          <button
            onClick={handleReuse}
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
          >
            {loading ? "Creating list..." : "Reuse this list"}
          </button>
        </div>
      </div>
    </div>
  );
}
