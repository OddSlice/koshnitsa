"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinListModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Join code must be 6 characters.");
      return;
    }

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

    // Look up the list by join code
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id, name")
      .eq("join_code", trimmed)
      .single();

    if (listError || !list) {
      setError("No list found with that code.");
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("list_members")
      .select("id")
      .eq("list_id", list.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Already a member, just navigate
      router.push(`/lists/${list.id}`);
      onClose();
      return;
    }

    // Join the list
    const { error: joinError } = await supabase
      .from("list_members")
      .insert({ list_id: list.id, user_id: user.id });

    if (joinError) {
      setError(joinError.message);
      setLoading(false);
      return;
    }

    router.push(`/lists/${list.id}`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Join a list</h2>

        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="joinCode"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Enter 6-character join code
            </label>
            <input
              id="joinCode"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              required
              autoFocus
              maxLength={6}
              placeholder="ABC123"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-widest text-gray-900 placeholder-gray-400 uppercase focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
              disabled={loading || code.trim().length !== 6}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
