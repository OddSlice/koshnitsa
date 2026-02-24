"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

interface ListOption {
  id: string;
  name: string;
}

interface ListItem {
  id: string;
  name: string;
}

interface DealResult {
  itemId: string;
  itemName: string;
  status: "deal" | "no_deal";
  store?: string;
  promoName?: string;
  price?: number;
  oldPrice?: number;
  discount?: number;
  validUntil?: string;
  picUrl?: string;
  score?: number;
}

type DealsState = "idle" | "loading" | "results" | "error";

// Store brand colors
const STORE_COLORS: Record<string, string> = {
  Lidl: "bg-blue-600",
  Kaufland: "bg-red-600",
  Billa: "bg-yellow-500",
  Fantastico: "bg-green-700",
  "T-Market": "bg-purple-600",
};

function getStoreColor(store: string): string {
  return STORE_COLORS[store] || "bg-gray-600";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil(
      (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 0) return "Expires today";
    if (diffDays === 1) return "1 day left";
    if (diffDays <= 7) return `${diffDays} days left`;

    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export default function DealsClient({
  userId,
  initialLists,
}: {
  userId: string;
  initialLists: ListOption[];
}) {
  const [lists] = useState<ListOption[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<string>(
    initialLists[0]?.id ?? ""
  );
  const [state, setState] = useState<DealsState>("idle");
  const [results, setResults] = useState<DealResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch unchecked items for the selected list, then call the deals API
  const handleFindDeals = useCallback(async () => {
    if (!selectedListId) {
      setError("Please select a list first.");
      return;
    }

    setState("loading");
    setError(null);
    setResults([]);

    try {
      // 1. Fetch unchecked items from the selected list
      const { data: items, error: fetchError } = await supabase
        .from("list_items")
        .select("id, name")
        .eq("list_id", selectedListId)
        .eq("is_checked", false);

      if (fetchError) throw new Error(fetchError.message);
      if (!items || items.length === 0) {
        setError("No unchecked items in this list. Add some items first!");
        setState("error");
        return;
      }

      // 2. Call the deals API
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i: ListItem) => ({ id: i.id, name: i.name })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Deal check failed (${res.status})`
        );
      }

      const { results: dealResults } = await res.json();
      setResults(dealResults);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }, [selectedListId, supabase]);

  // Group results by status
  const deals = results.filter((r) => r.status === "deal");
  const noDeals = results.filter((r) => r.status === "no_deal");

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Deals</h1>
        <p className="text-sm text-gray-500">
          Check current promotions for your shopping list items.
        </p>
      </div>

      {/* List selector */}
      {lists.length === 0 ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            You don&apos;t have any active lists. Create a list first to check
            deals.
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <label
            htmlFor="dealsList"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Check deals for
          </label>
          <select
            id="dealsList"
            value={selectedListId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              setState("idle");
              setResults([]);
            }}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Find Deals button */}
      {lists.length > 0 && (
        <button
          onClick={handleFindDeals}
          disabled={state === "loading"}
          className="mb-6 w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
        >
          {state === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Checking promotions...
            </span>
          ) : (
            "Find Deals"
          )}
        </button>
      )}

      {/* === IDLE STATE === */}
      {state === "idle" && lists.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <svg
            className="mb-3 h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6h.008v.008H6V6Z"
            />
          </svg>
          <p className="text-sm text-gray-400">
            Tap &quot;Find Deals&quot; to check current promotions at Lidl,
            Kaufland, Billa, and more.
          </p>
        </div>
      )}

      {/* === ERROR STATE === */}
      {state === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-center">
          <svg
            className="mx-auto mb-2 h-7 w-7 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm font-medium text-red-700">
            {error || "Something went wrong."}
          </p>
        </div>
      )}

      {/* === RESULTS STATE === */}
      {state === "results" && (
        <div className="flex flex-col gap-5">
          {/* Summary */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-green-600">
                {deals.length}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Deals found
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-gray-400">
                {noDeals.length}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                No deals
              </div>
            </div>
          </div>

          {/* Deals found */}
          {deals.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
                Deals found ({deals.length})
              </h2>
              <div className="flex flex-col gap-2">
                {deals.map((deal) => (
                  <DealCard key={deal.itemId} deal={deal} />
                ))}
              </div>
            </div>
          )}

          {/* No deals */}
          {noDeals.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                No deal found ({noDeals.length})
              </h2>
              <div className="flex flex-col gap-1.5">
                {noDeals.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <svg
                        className="h-3.5 w-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500">
                      {item.itemName}
                    </span>
                    <span className="ml-auto text-[10px] font-medium text-gray-300 uppercase">
                      No deal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results at all */}
          {results.length === 0 && (
            <div className="rounded-2xl bg-gray-50 px-6 py-8 text-center">
              <p className="text-sm text-gray-400">
                No items to check. Add unchecked items to your list first.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Deal card sub-component ---

function DealCard({ deal }: { deal: DealResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
      <div className="flex items-start gap-3 p-3">
        {/* Store badge */}
        <div className="shrink-0">
          <span
            className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${getStoreColor(deal.store ?? "")}`}
          >
            {deal.store}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Your item name */}
          <p className="text-xs text-gray-400">{deal.itemName}</p>
          {/* Promo product name */}
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {deal.promoName}
          </p>

          {/* Prices */}
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-bold text-green-600">
              {deal.price?.toFixed(2)} лв
            </span>
            {deal.oldPrice != null && deal.oldPrice > 0 && (
              <span className="text-xs text-gray-400 line-through">
                {deal.oldPrice.toFixed(2)} лв
              </span>
            )}
            {deal.discount != null && deal.discount > 0 && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                -{deal.discount}%
              </span>
            )}
          </div>

          {/* Valid until */}
          {deal.validUntil && (
            <p className="mt-1 text-[10px] text-gray-400">
              {formatDate(deal.validUntil)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
