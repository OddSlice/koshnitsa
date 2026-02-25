"use client";

// --- Shared constants & helpers for deal display ---

export const STORE_COLORS: Record<string, string> = {
  Lidl: "bg-blue-600",
  Kaufland: "bg-red-600",
  Billa: "bg-yellow-500",
  Fantastico: "bg-green-700",
  "T-Market": "bg-purple-600",
};

export const STORE_PROMO_URLS: Record<string, string> = {
  Lidl: "https://www.lidl.bg/broshura",
  Kaufland: "https://www.kaufland.bg/aktualni-oferti.html",
  Billa: "https://www.billa.bg/produkti-v-promociya",
  Fantastico: "https://fantastico.bg/%D0%B1%D1%80%D0%BE%D1%88%D1%83%D1%80%D0%B0",
  "T-Market": "https://tmarket.bg/offers",
};

export function getStoreColor(store: string): string {
  return STORE_COLORS[store] || "bg-gray-600";
}

export function formatDate(dateStr: string): string {
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

// --- Types ---

export interface DealResult {
  itemId: string;
  itemName: string;
  status: "deal" | "no_deal" | "estimated";
  // deal fields
  store?: string;
  promoName?: string;
  price?: number;
  oldPrice?: number;
  discount?: number;
  validUntil?: string;
  picUrl?: string;
  score?: number;
  // estimated fields
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  estimatedStore?: string | null;
  confidence?: "high" | "medium" | "low";
  priceEstimatedAt?: string | null;
}

// --- Deal card ---

export function DealCard({
  deal,
  onAddToList,
}: {
  deal: DealResult;
  onAddToList?: (itemName: string) => void;
}) {
  const storePromoUrl = STORE_PROMO_URLS[deal.store ?? ""];

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
          <p className="text-sm font-semibold leading-tight text-gray-900">
            {deal.promoName}
          </p>

          {/* Prices */}
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-bold text-green-600">
              {deal.price?.toFixed(2)} €
            </span>
            {deal.oldPrice != null && deal.oldPrice > 0 && (
              <span className="text-xs text-gray-400 line-through">
                {deal.oldPrice.toFixed(2)} €
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

          {/* Source link */}
          {storePromoUrl && (
            <a
              href={storePromoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600"
            >
              View at {deal.store}
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          )}
        </div>

        {/* Product image thumbnail */}
        {deal.picUrl && (
          <img
            src={deal.picUrl}
            alt={deal.promoName ?? ""}
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        )}
      </div>

      {/* Add to list button */}
      {onAddToList && (
        <button
          onClick={() => onAddToList(deal.promoName ?? deal.itemName)}
          className="w-full border-t border-green-100 py-2 text-xs font-semibold text-green-700 active:bg-green-50"
        >
          + Add to list
        </button>
      )}
    </div>
  );
}

// --- Estimate card ---

export function EstimateCard({
  item,
  onAddToList,
}: {
  item: DealResult;
  onAddToList?: (itemName: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-100 bg-white">
      <div className="flex items-start gap-3 p-3">
        {/* Store or estimate badge */}
        <div className="shrink-0">
          {item.estimatedStore ? (
            <span
              className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${getStoreColor(item.estimatedStore)}`}
            >
              {item.estimatedStore}
            </span>
          ) : (
            <span className="inline-block rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              ~ Est.
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-gray-900">
            {item.itemName}
          </p>

          {/* Price range */}
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-bold text-amber-600">
              ~ {item.estimatedPriceMin?.toFixed(2)} –{" "}
              {item.estimatedPriceMax?.toFixed(2)} €
            </span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
              ~ Estimated
            </span>
          </div>

          {/* Confidence + disclaimer */}
          <div className="mt-1 flex items-center gap-1.5">
            {item.confidence === "low" && (
              <svg
                className="h-3 w-3 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            )}
            <span className="text-[10px] italic text-gray-400">
              AI estimate — not a confirmed price
            </span>
          </div>
        </div>
      </div>

      {/* Add to list button */}
      {onAddToList && (
        <button
          onClick={() => onAddToList(item.itemName)}
          className="w-full border-t border-amber-100 py-2 text-xs font-semibold text-amber-700 active:bg-amber-50"
        >
          + Add to list
        </button>
      )}
    </div>
  );
}
