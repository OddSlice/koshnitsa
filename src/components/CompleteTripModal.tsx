"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Item {
  id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
}

export default function CompleteTripModal({
  listId,
  listName,
  items,
  userId,
  onClose,
}: {
  listId: string;
  listName: string;
  items: Item[];
  userId: string;
  onClose: () => void;
}) {
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleComplete() {
    setLoading(true);
    setError(null);

    // Build snapshot of all items
    const snapshot = items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      category: item.category,
      is_checked: item.is_checked,
    }));

    // Save the snapshot
    const { error: snapError } = await supabase
      .from("list_snapshots")
      .insert({
        list_id: listId,
        list_name: listName,
        user_id: userId,
        items: snapshot,
        store_name: storeName.trim() || null,
      });

    if (snapError) {
      setError(snapError.message);
      setLoading(false);
      return;
    }

    // Archive the list
    const { error: archiveError } = await supabase
      .from("lists")
      .update({ is_archived: true })
      .eq("id", listId);

    if (archiveError) {
      setError(archiveError.message);
      setLoading(false);
      return;
    }

    router.push("/lists");
    router.refresh();
  }

  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-8 sm:rounded-2xl sm:pb-6">
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          Complete this trip?
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          This will save a snapshot of your list ({checkedCount}/{items.length}{" "}
          items checked) and archive it. You can reuse it later from History.
        </p>

        <div className="mb-4">
          <label
            htmlFor="storeName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Store name{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="storeName"
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Лидл, Кауфланд, Билла"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Complete trip"}
          </button>
        </div>
      </div>
    </div>
  );
}
