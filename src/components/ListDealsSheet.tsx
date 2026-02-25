"use client";

import { useCallback, useEffect, useState } from "react";
import { DealCard, EstimateCard, type DealResult } from "./DealCard";

type SheetState = "loading" | "estimating" | "results" | "error";

interface ListDealsSheetProps {
  listId: string;
  items: {
    id: string;
    name: string;
    is_checked: boolean;
    estimated_price_min?: number | null;
    estimated_price_max?: number | null;
    estimated_store?: string | null;
    price_confidence?: string | null;
    price_estimated_at?: string | null;
  }[];
  onClose: () => void;
}

export default function ListDealsSheet({
  listId: _listId,
  items,
  onClose,
}: ListDealsSheetProps) {
  void _listId; // Reserved for future use
  const [state, setState] = useState<SheetState>("loading");
  const [results, setResults] = useState<DealResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setState("loading");
    setError(null);
    setResults([]);

    // Only check unchecked items
    const uncheckedItems = items.filter((i) => !i.is_checked);

    if (uncheckedItems.length === 0) {
      setError("No unchecked items in this list.");
      setState("error");
      return;
    }

    try {
      // 1. Call the deals API
      const dealsRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: uncheckedItems.map((i) => ({
            id: i.id,
            name: i.name,
            estimated_price_min: i.estimated_price_min,
            estimated_price_max: i.estimated_price_max,
            estimated_store: i.estimated_store,
            price_confidence: i.price_confidence,
            price_estimated_at: i.price_estimated_at,
          })),
        }),
      });

      if (!dealsRes.ok) {
        const errData = await dealsRes.json().catch(() => ({}));
        throw new Error(
          errData.error || `Deal check failed (${dealsRes.status})`
        );
      }

      const { results: dealResults } = (await dealsRes.json()) as {
        results: DealResult[];
      };

      setResults(dealResults);
      setState("results");

      // 2. Auto-estimate unmatched items
      const unmatched = dealResults.filter(
        (r: DealResult) => r.status === "no_deal"
      );

      if (unmatched.length > 0) {
        setState("estimating");

        try {
          const estRes = await fetch("/api/estimate-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: unmatched.map((r: DealResult) => ({
                itemId: r.itemId,
                name: r.itemName,
              })),
            }),
          });

          if (estRes.ok) {
            const { estimates } = (await estRes.json()) as {
              estimates: {
                itemId: string;
                itemName: string;
                estimatedPriceMin: number;
                estimatedPriceMax: number;
                mostLikelyStore: string | null;
                confidence: "high" | "medium" | "low";
              }[];
            };

            setResults((prev) =>
              prev.map((r) => {
                if (r.status !== "no_deal") return r;
                const est = estimates.find((e) => e.itemId === r.itemId);
                if (!est) return r;
                return {
                  ...r,
                  status: "estimated" as const,
                  estimatedPriceMin: est.estimatedPriceMin,
                  estimatedPriceMax: est.estimatedPriceMax,
                  estimatedStore: est.mostLikelyStore,
                  confidence: est.confidence,
                };
              })
            );
          }
        } catch {
          // Non-blocking — estimation is supplementary
        }

        setState("results");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }, [items]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Group results
  const deals = results.filter((r) => r.status === "deal");
  const estimated = results.filter((r) => r.status === "estimated");
  const noDeals = results.filter((r) => r.status === "no_deal");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Deals & Prices</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <svg
              className="h-5 w-5 text-gray-500"
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
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-3 border-green-200 border-t-green-600" />
              <p className="text-sm text-gray-500">Checking promotions...</p>
            </div>
          )}

          {/* Estimating */}
          {state === "estimating" && (
            <div className="flex flex-col gap-4">
              {/* Show deals found so far */}
              {deals.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
                    Deals found ({deals.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {deals.map((deal) => (
                      <DealCard key={deal.itemId} deal={deal} />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
                <span className="text-xs font-medium text-amber-600">
                  Estimating prices for {noDeals.length} item
                  {noDeals.length !== 1 ? "s" : ""}...
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-center">
              <p className="text-sm font-medium text-red-700">
                {error || "Something went wrong."}
              </p>
            </div>
          )}

          {/* Results */}
          {state === "results" && (
            <div className="flex flex-col gap-4">
              {/* Summary bar */}
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-green-600">
                    {deals.length}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    Deals
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-amber-500">
                    {estimated.length}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    Estimated
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-gray-400">
                    {noDeals.length}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    No data
                  </div>
                </div>
              </div>

              {/* Deals */}
              {deals.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
                    Deals found ({deals.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {deals.map((deal) => (
                      <DealCard key={deal.itemId} deal={deal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Estimated */}
              {estimated.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500">
                    Price estimates ({estimated.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {estimated.map((item) => (
                      <EstimateCard key={item.itemId} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* No data */}
              {noDeals.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    No data ({noDeals.length})
                  </h3>
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
                        <span className="ml-auto text-[10px] font-medium uppercase text-gray-300">
                          No data
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
                    No items to check.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
