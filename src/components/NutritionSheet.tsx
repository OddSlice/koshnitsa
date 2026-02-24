"use client";

interface NutritionSheetProps {
  itemName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string | null;
  onClose: () => void;
}

export default function NutritionSheet({
  itemName,
  calories,
  protein,
  carbs,
  fat,
  description,
  onClose,
}: NutritionSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mb-3 flex justify-center sm:hidden">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        <div className="mb-1 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Nutrition info
          </h3>
        </div>
        <p className="mb-3 text-xs text-gray-500">{itemName}</p>

        {/* 2x2 stat grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-400">Calories</div>
            <div className="text-sm font-semibold text-gray-800">
              {calories}{" "}
              <span className="font-normal text-gray-400">kcal</span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-400">Protein</div>
            <div className="text-sm font-semibold text-gray-800">
              {protein}
              <span className="font-normal text-gray-400">g</span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-400">Carbs</div>
            <div className="text-sm font-semibold text-gray-800">
              {carbs}
              <span className="font-normal text-gray-400">g</span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-400">Fat</div>
            <div className="text-sm font-semibold text-gray-800">
              {fat}
              <span className="font-normal text-gray-400">g</span>
            </div>
          </div>
        </div>

        {description && (
          <p className="mt-2.5 text-xs text-gray-500">{description}</p>
        )}

        <p className="mt-1.5 text-[10px] text-gray-300 italic">
          ~ estimated per 100g
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}
