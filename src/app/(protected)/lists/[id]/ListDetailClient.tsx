"use client";

import AddItemModal from "@/components/AddItemModal";
import CompleteTripModal from "@/components/CompleteTripModal";
import ListItem from "@/components/ListItem";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface Item {
  id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
  created_at: string;
  checked_at: string | null;
  added_by: string | null;
  checked_by: string | null;
}

interface ListInfo {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
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

export default function ListDetailClient({
  list,
  initialItems,
  userId,
}: {
  list: ListInfo;
  initialItems: Item[];
  userId: string;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCompleteTrip, setShowCompleteTrip] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`list-items-${list.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          setItems((prev) => {
            if (prev.some((item) => item.id === payload.new.id)) return prev;
            return [...prev, payload.new as Item];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? (payload.new as Item) : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          setItems((prev) =>
            prev.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [list.id, supabase]);

  const handleToggleItem = useCallback(
    async (itemId: string, checked: boolean) => {
      await supabase
        .from("list_items")
        .update({
          is_checked: checked,
          checked_at: checked ? new Date().toISOString() : null,
          checked_by: checked ? userId : null,
        })
        .eq("id", itemId);
    },
    [supabase, userId]
  );

  const handleItemAdded = useCallback(() => {
    setShowAddItem(false);
  }, []);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(list.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Split items into unchecked and checked
  const uncheckedItems = items.filter((i) => !i.is_checked);
  const checkedItems = items.filter((i) => i.is_checked);

  // Group unchecked items by category
  const groupedUnchecked = CATEGORY_ORDER.reduce(
    (acc, category) => {
      const categoryItems = uncheckedItems.filter(
        (i) => i.category === category
      );
      if (categoryItems.length > 0) {
        acc.push({ category, items: categoryItems });
      }
      return acc;
    },
    [] as { category: string; items: Item[] }[]
  );

  const otherUnchecked = uncheckedItems.filter(
    (i) => !CATEGORY_ORDER.includes(i.category)
  );
  if (otherUnchecked.length > 0) {
    groupedUnchecked.push({ category: "Other", items: otherUnchecked });
  }

  return (
    <div className="px-4 pt-4 pb-36">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/lists"
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
          <h1 className="text-xl font-bold text-gray-900">{list.name}</h1>
          <p className="text-xs text-gray-500">
            {list.memberCount}{" "}
            {list.memberCount === 1 ? "member" : "members"} &middot;{" "}
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
            />
          </svg>
          Invite
        </button>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <div className="mb-3 text-3xl">📝</div>
          <h2 className="mb-1 text-base font-semibold text-gray-800">
            No items yet
          </h2>
          <p className="text-sm text-gray-500">
            Add your first item to this list.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedUnchecked.map(({ category, items: categoryItems }) => (
            <div key={category}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {category}
              </h2>
              <div className="flex flex-col gap-1">
                {categoryItems.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                  />
                ))}
              </div>
            </div>
          ))}

          {checkedItems.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Done ({checkedItems.length})
              </h2>
              <div className="flex flex-col gap-1">
                {checkedItems.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom action buttons */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            onClick={() => setShowAddItem(true)}
            className="flex-1 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-green-700 active:bg-green-800"
          >
            + Add item
          </button>
          {items.length > 0 && (
            <button
              onClick={() => setShowCompleteTrip(true)}
              className="rounded-xl border-2 border-green-600 bg-white px-4 py-3.5 text-sm font-semibold text-green-600 shadow-lg hover:bg-green-50 active:bg-green-100"
            >
              Complete trip
            </button>
          )}
        </div>
      </div>

      {/* Add item modal */}
      {showAddItem && (
        <AddItemModal
          listId={list.id}
          userId={userId}
          onClose={() => setShowAddItem(false)}
          onAdded={handleItemAdded}
        />
      )}

      {/* Complete trip modal */}
      {showCompleteTrip && (
        <CompleteTripModal
          listId={list.id}
          listName={list.name}
          items={items}
          userId={userId}
          onClose={() => setShowCompleteTrip(false)}
        />
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-8 sm:rounded-2xl sm:pb-6">
            <h2 className="mb-2 text-lg font-bold text-gray-900">
              Invite to list
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Share this code with friends so they can join your list.
            </p>
            <div className="mb-4 flex items-center justify-center gap-3 rounded-xl bg-gray-100 py-4">
              <span className="font-mono text-2xl font-bold tracking-[0.3em] text-gray-900">
                {list.joinCode}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleCopyCode}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
