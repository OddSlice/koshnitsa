"use client";

import { memo } from "react";

export interface ListItemData {
  id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  nutrition_description?: string | null;
}

interface ListItemProps {
  item: ListItemData;
  onToggle: (itemId: string, checked: boolean) => void;
  onNutritionTap?: (item: ListItemData) => void;
}

function ListItemComponent({ item, onToggle, onNutritionTap }: ListItemProps) {
  const hasNutrition = item.calories != null;

  return (
    <div
      className={`flex w-full items-start gap-3 rounded-lg bg-white px-3 py-2.5 ${
        item.is_checked ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox + content as one tappable area */}
      <button
        onClick={() => onToggle(item.id, !item.is_checked)}
        className="flex flex-1 items-start gap-3 text-left active:bg-gray-50 rounded-lg"
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

      {/* Nutrition info icon — only shown if item has nutrition data */}
      {hasNutrition && onNutritionTap && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNutritionTap(item);
          }}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-300 hover:text-green-600 active:text-green-700"
          aria-label="Nutrition info"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default memo(ListItemComponent);
