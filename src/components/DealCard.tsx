"use client";

// --- Shared constants & helpers for deal display ---

export const STORE_COLORS: Record<string, string> = {
  Lidl: "bg-blue-600",
  Kaufland: "bg-red-600",
  Billa: "bg-yellow-500",
  Fantastico: "bg-green-700",
  "T-Market": "bg-purple-600",
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

    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

// --- Types ---

/** Deal result from the list-based /api/deals route */
export interface DealResult {
  itemId: string;
  itemName: string;
  status: "deal" | "no_deal" | "estimated";
  productId?: number;
  store?: string;
  storeLogo?: string | null;
  promoName?: string;
  price?: number | null;
  oldPrice?: number | null;
  discount?: number | null;
  quantity?: string | null;
  imageUrl?: string | null;
  productUrl?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  estimatedStore?: string | null;
  confidence?: "high" | "medium" | "low";
  priceEstimatedAt?: string | null;
}

/** Search result from /api/deals/search (Price Barometer product) */
export interface SearchResult {
  id: number;
  name: string;
  description: string | null;
  priceEur: number | null;
  oldPriceEur: number | null;
  discount: number | null;
  quantity: string | null;
  category: string | null;
  imageUrl: string | null;
  productUrl: string;
  store: string;
  storeLogo: string | null;
  validFrom: string | null;
  validUntil: string | null;
}

// --- Search result card (from Price Barometer API) ---

export function ProductDealCard({
  product,
  onAddToList,
}: {
  product: SearchResult;
  onAddToList?: (itemName: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
      <div className="flex items-start gap-3 p-3">
        {/* Store badge */}
        <div className="shrink-0">
          <span
            className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${getStoreColor(product.store)}`}
          >
            {product.store}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-gray-900">
            {product.name}
          </p>
          {product.quantity && (
            <p className="text-xs text-gray-400">{product.quantity}</p>
          )}

          {/* Prices */}
          <div className="mt-1.5 flex items-baseline gap-2">
            {product.priceEur != null && (
              <span className="text-base font-bold text-green-600">
                {product.priceEur.toFixed(2)} €
              </span>
            )}
            {product.oldPriceEur != null && product.oldPriceEur > 0 && (
              <span className="text-xs text-gray-400 line-through">
                {product.oldPriceEur.toFixed(2)} €
              </span>
            )}
            {product.discount != null && product.discount > 0 && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                -{product.discount}%
              </span>
            )}
          </div>

          {/* Validity */}
          {product.validUntil && (
            <p className="mt-1 text-[10px] text-gray-400">
              {formatDate(product.validUntil)}
            </p>
          )}

          {/* Source link */}
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600"
          >
            View on Price Barometer
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>

        {/* Product image */}
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        )}
      </div>

      {onAddToList && (
        <button onClick={() => onAddToList(product.name)} className="w-full border-t border-green-100 py-2 text-xs font-semibold text-green-700 active:bg-green-50">
          + Add to list
        </button>
      )}
    </div>
  );
}

// --- List deal card (for ListDealsSheet) ---

export function DealCard({ deal }: { deal: DealResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
      <div className="flex items-start gap-3 p-3">
        <div className="shrink-0">
          <span className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${getStoreColor(deal.store ?? "")}`}>
            {deal.store}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400">{deal.itemName}</p>
          <p className="text-sm font-semibold leading-tight text-gray-900">{deal.promoName}</p>
          {deal.quantity && <p className="text-xs text-gray-400">{deal.quantity}</p>}

          <div className="mt-1.5 flex items-baseline gap-2">
            {deal.price != null && (
              <span className="text-base font-bold text-green-600">{deal.price.toFixed(2)} €</span>
            )}
            {deal.oldPrice != null && deal.oldPrice > 0 && (
              <span className="text-xs text-gray-400 line-through">{deal.oldPrice.toFixed(2)} €</span>
            )}
            {deal.discount != null && deal.discount > 0 && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">-{deal.discount}%</span>
            )}
          </div>

          {deal.validUntil && (
            <p className="mt-1 text-[10px] text-gray-400">{formatDate(deal.validUntil)}</p>
          )}

          {deal.productUrl && (
            <a href={deal.productUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
              View on Price Barometer
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>

        {deal.imageUrl && (
          <img src={deal.imageUrl} alt={deal.promoName ?? ""} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        )}
      </div>
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
        <div className="shrink-0">
          {item.estimatedStore ? (
            <span className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${getStoreColor(item.estimatedStore)}`}>
              {item.estimatedStore}
            </span>
          ) : (
            <span className="inline-block rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">~ Est.</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-gray-900">{item.itemName}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-base font-bold text-amber-600">
              ~ {item.estimatedPriceMin?.toFixed(2)} – {item.estimatedPriceMax?.toFixed(2)} €
            </span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">~ Estimated</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {item.confidence === "low" && (
              <svg className="h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            )}
            <span className="text-[10px] italic text-gray-400">AI estimate — not a confirmed price</span>
          </div>
        </div>
      </div>

      {onAddToList && (
        <button onClick={() => onAddToList(item.itemName)} className="w-full border-t border-amber-100 py-2 text-xs font-semibold text-amber-700 active:bg-amber-50">
          + Add to list
        </button>
      )}
    </div>
  );
}
