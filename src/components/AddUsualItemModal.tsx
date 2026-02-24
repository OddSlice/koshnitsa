"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const CATEGORIES = [
  "Плодове и зеленчуци",
  "Месо и риба",
  "Мляко и яйца",
  "Хляб и тестени",
  "Замразени",
  "Почистване",
  "Лични грижи",
  "Друго",
];

export default function AddUsualItemModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1x");
  const [category, setCategory] = useState("Друго");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("usual_items")
      .insert({
        user_id: userId,
        name: name.trim(),
        quantity: quantity.trim() || "1x",
        category,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onAdded();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-8 sm:rounded-2xl sm:pb-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Add usual item
        </h2>

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="usualName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="usualName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Мляко"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="w-24">
              <label
                htmlFor="usualQty"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Qty
              </label>
              <input
                id="usualQty"
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1x"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="usualCategory"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Category
              </label>
              <select
                id="usualCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
