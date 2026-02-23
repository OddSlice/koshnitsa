"use client";

import { memo } from "react";

interface UsualItemChipProps {
  id: string;
  name: string;
  quantity: string;
  category: string;
  onAdd: (item: { name: string; quantity: string; category: string }) => void;
  onDelete: (id: string) => void;
  showDelete: boolean;
}

function UsualItemChipComponent({
  id,
  name,
  quantity,
  category,
  onAdd,
  onDelete,
  showDelete,
}: UsualItemChipProps) {
  return (
    <button
      onClick={() =>
        showDelete ? onDelete(id) : onAdd({ name, quantity, category })
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        showDelete
          ? "border-red-200 bg-red-50 text-red-700 active:bg-red-100"
          : "border-gray-200 bg-white text-gray-800 active:bg-gray-100"
      }`}
    >
      {showDelete && (
        <svg
          className="h-3 w-3"
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
      )}
      <span>{name}</span>
      {quantity && quantity !== "1x" && (
        <span className="text-gray-400">{quantity}</span>
      )}
      {!showDelete && (
        <svg
          className="h-3 w-3 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      )}
    </button>
  );
}

export default memo(UsualItemChipComponent);
