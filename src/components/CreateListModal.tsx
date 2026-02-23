"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateListModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    // Create the list
    const { data: list, error: listError } = await supabase
      .from("lists")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (listError || !list) {
      setError(listError?.message ?? "Failed to create list.");
      setLoading(false);
      return;
    }

    // Add creator as a member
    const { error: memberError } = await supabase
      .from("list_members")
      .insert({ list_id: list.id, user_id: user.id });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Create new list
        </h2>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="listName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              List name
            </label>
            <input
              id="listName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Weekly groceries"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
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
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
