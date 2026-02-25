"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DealCard,
  EstimateCard,
  type DealResult,
} from "@/components/DealCard";
import PickListModal from "@/components/PickListModal";

interface ListOption {
  id: string;
  name: string;
}

interface SearchDealResult {
  store: string;
  promoName: string;
  price: number;
  oldPrice: number;
  discount: number;
  validUntil: string;
  picUrl: string;
  score: number;
}

interface SearchEstimate {
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  mostLikelyStore: string | null;
  confidence: "high" | "medium" | "low";
}

type SearchState = "idle" | "loading" | "results" | "error";

export default function DealsClient({
  userId,
  initialLists,
}: {
  userId: string;
  initialLists: ListOption[];
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [deals, setDeals] = useState<SearchDealResult[]>([]);
  const [estimate, setEstimate] = useState<SearchEstimate | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Add to list state
  const [showPickList, setShowPickList] = useState(false);
  const [addingItemName, setAddingItemName] = useState("");
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      if (state !== "idle") {
        setState("idle");
        setDeals([]);
        setEstimate(null);
        setSearchedQuery("");
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(trimmed);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function performSearch(searchQuery: string) {
    setState("loading");
    setError(null);
    setDeals([]);
    setEstimate(null);
    setSearchedQuery(searchQuery);

    try {
      const res = await fetch("/api/deals/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search failed (${res.status})`);
      }

      const data = (await res.json()) as {
        deals: SearchDealResult[];
        estimate: SearchEstimate | null;
        query: string;
      };

      setDeals(data.deals);
      setEstimate(data.estimate);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  // Handle form submit (Enter key)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      performSearch(trimmed);
    }
  }

  // Add to list
  const handleAddToList = useCallback((itemName: string) => {
    setAddingItemName(itemName);
    setShowPickList(true);
  }, []);

  const handleListPicked = useCallback(
    async (listId: string) => {
      setShowPickList(false);

      try {
        await supabase.from("list_items").insert({
          list_id: listId,
          added_by: userId,
          name: addingItemName,
          quantity: "1",
          category: "Друго",
          is_checked: false,
        });

        const listName =
          initialLists.find((l) => l.id === listId)?.name ?? "list";
        setAddSuccess(`Added "${addingItemName}" to ${listName}`);
        setTimeout(() => setAddSuccess(null), 2500);
      } catch {
        // Silent fail — item might still be added via realtime
      }
    },
    [supabase, userId, addingItemName, initialLists]
  );

  // Convert search results to DealResult format for shared components
  const dealResults: DealResult[] = deals.map((d, idx) => ({
    itemId: `search-${idx}`,
    itemName: searchedQuery,
    status: "deal" as const,
    store: d.store,
    promoName: d.promoName,
    price: d.price,
    oldPrice: d.oldPrice,
    discount: d.discount,
    validUntil: d.validUntil,
    picUrl: d.picUrl,
    score: d.score,
  }));

  const estimateResult: DealResult | null = estimate
    ? {
        itemId: "search-estimate",
        itemName: searchedQuery,
        status: "estimated" as const,
        estimatedPriceMin: estimate.estimatedPriceMin,
        estimatedPriceMax: estimate.estimatedPriceMax,
        estimatedStore: estimate.mostLikelyStore,
        confidence: estimate.confidence,
      }
    : null;

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Deals</h1>
        <p className="text-sm text-gray-500">
          Search for products to find current promotions and prices.
        </p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-5">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a product..."
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Success toast */}
      {addSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
          <span className="text-sm font-medium text-green-700">
            {addSuccess}
          </span>
        </div>
      )}

      {/* === IDLE STATE === */}
      {state === "idle" && (
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
            Type a product name to search current promotions at Lidl, Kaufland,
            Billa, and more.
          </p>
        </div>
      )}

      {/* === LOADING STATE === */}
      {state === "loading" && (
        <div className="flex flex-col items-center justify-center py-12">
          <span className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-3 border-green-200 border-t-green-600" />
          <p className="text-sm text-gray-500">
            Searching for &quot;{searchedQuery}&quot;...
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
          {/* Deals found */}
          {dealResults.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
                Promotions for &quot;{searchedQuery}&quot; ({dealResults.length})
              </h2>
              <div className="flex flex-col gap-2">
                {dealResults.map((deal) => (
                  <DealCard
                    key={deal.itemId}
                    deal={deal}
                    onAddToList={
                      initialLists.length > 0 ? handleAddToList : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Price estimate (shown when no deals found) */}
          {estimateResult && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500">
                Price estimate
              </h2>
              <EstimateCard
                item={estimateResult}
                onAddToList={
                  initialLists.length > 0 ? handleAddToList : undefined
                }
              />
            </div>
          )}

          {/* No results at all */}
          {dealResults.length === 0 && !estimateResult && (
            <div className="rounded-2xl bg-gray-50 px-6 py-8 text-center">
              <p className="text-sm text-gray-400">
                No promotions or price data found for &quot;{searchedQuery}
                &quot;.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pick list modal */}
      {showPickList && initialLists.length > 0 && (
        <PickListModal
          lists={initialLists}
          onPick={handleListPicked}
          onClose={() => setShowPickList(false)}
        />
      )}
    </div>
  );
}
