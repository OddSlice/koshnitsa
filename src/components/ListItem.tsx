"use client";

import { memo } from "react";

interface Item {
  id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
}

interface ListItemProps {
  item: Item;
  onToggle: (itemId: string, checked: boolean) => void;
}

function ListItemComponent({ item, onToggle }: ListItemProps) {
  return (
    <button
      onClick={() => onToggle(item.id, !item.is_checked)}
      className={`flex w-full items-start gap-3 rounded-lg bg-white px-3 py-2.5 text-left transition-colors active:bg-gray-50 ${
        item.is_checked ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          item.is_checked
            ? "border-green-600 bg-green-600"
            : "border-gray-300"
        }`}
      >
        {item.is_checked && (
          <svg
            className="h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-sm font-medium ${
              item.is_checked
                ? "text-gray-400 line-through"
                : "text-gray-900"
            }`}
          >
            {item.name}
          </span>
          {item.quantity && item.quantity !== "1x" && (
            <span className="shrink-0 text-xs text-gray-500">
              {item.quantity}
            </span>
          )}
        </div>
        {item.note && (
          <p
            className={`mt-0.5 text-xs ${
              item.is_checked ? "text-gray-300" : "text-gray-400"
            }`}
          >
            {item.note}
          </p>
        )}
      </div>
    </button>
  );
}

export default memo(ListItemComponent);
