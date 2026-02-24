"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

const CATEGORIES = [
  "Плодове и зеленчуци",
  "Месо и риба",
  "Мляко и яйца",
  "Хляб и тестени",
  "Замразени",
  "Почистване",
  "Лични грижи",
  "Друго",
];

const FOOD_CATEGORIES = [
  "Плодове и зеленчуци",
  "Месо и риба",
  "Мляко и яйца",
  "Хляб и тестени",
  "Замразени",
];

interface IdentifiedItem {
  name: string;
  quantity: string;
  category: string;
  confidence: number;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  estimated: boolean;
}

interface ListOption {
  id: string;
  name: string;
}

type ScanState = "idle" | "loading" | "result" | "added" | "error";

export default function ScanClient({ userId }: { userId: string }) {
  const [state, setState] = useState<ScanState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [item, setItem] = useState<IdentifiedItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields for the confirmation card
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editCategory, setEditCategory] = useState("Друго");
  const [editNote, setEditNote] = useState("");

  // Nutrition
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionExpanded, setNutritionExpanded] = useState(false);

  // List picking
  const [lists, setLists] = useState<ListOption[]>([]);
  const [showListPicker, setShowListPicker] = useState(false);
  const [adding, setAdding] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Fetch user's active lists on mount
  useEffect(() => {
    async function fetchLists() {
      const { data: memberships } = await supabase
        .from("list_members")
        .select("list_id")
        .eq("user_id", userId);

      if (!memberships || memberships.length === 0) return;

      const listIds = memberships.map((m) => m.list_id);
      const { data: userLists } = await supabase
        .from("lists")
        .select("id, name")
        .in("id", listIds)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (userLists) setLists(userLists);
    }
    fetchLists();
  }, [userId, supabase]);

  // Resize image to save bandwidth and speed up OpenAI call
  const resizeImage = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 1024;
            let w = img.width;
            let h = img.height;
            if (w > MAX || h > MAX) {
              if (w > h) {
                h = Math.round((h * MAX) / w);
                w = MAX;
              } else {
                w = Math.round((w * MAX) / h);
                h = MAX;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }),
    []
  );

  // Fetch nutrition data for food items
  const fetchNutrition = useCallback(
    async (productName: string, quantity: string, category: string) => {
      // Only fetch for food categories
      if (!FOOD_CATEGORIES.includes(category)) {
        setNutrition(null);
        return;
      }

      setNutritionLoading(true);
      try {
        const res = await fetch("/api/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: productName, quantity }),
        });

        if (res.ok) {
          const data: NutritionData = await res.json();
          setNutrition(data);
        } else {
          // Nutrition is supplementary — don't fail the whole flow
          console.warn("Nutrition fetch failed:", res.status);
          setNutrition(null);
        }
      } catch (err) {
        console.warn("Nutrition fetch error:", err);
        setNutrition(null);
      } finally {
        setNutritionLoading(false);
      }
    },
    []
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setState("loading");
      setError(null);
      setItem(null);
      setNutrition(null);
      setNutritionExpanded(false);

      try {
        // Resize and set preview
        const dataUrl = await resizeImage(file);
        setPreview(dataUrl);

        // Call the API
        const res = await fetch("/api/identify-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `Identification failed (${res.status})`
          );
        }

        const result: IdentifiedItem = await res.json();

        if (!result.name) {
          throw new Error(
            "Could not identify the product. Try a clearer photo."
          );
        }

        setItem(result);
        setEditName(result.name);
        setEditQuantity(result.quantity);
        setEditCategory(result.category);
        setEditNote("");
        setState("result");

        // Fire nutrition fetch in the background (non-blocking)
        fetchNutrition(result.name, result.quantity, result.category);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setState("error");
      }

      // Reset file input so same file can be re-selected
      e.target.value = "";
    },
    [resizeImage, fetchNutrition]
  );

  const handleAddToList = useCallback(
    async (listId: string) => {
      setAdding(true);
      setShowListPicker(false);

      // Build the insert payload — include nutrition if available
      const payload: Record<string, unknown> = {
        list_id: listId,
        added_by: userId,
        name: editName.trim(),
        quantity: editQuantity.trim() || "1x",
        note: editNote.trim() || null,
        category: editCategory,
      };

      if (nutrition) {
        payload.calories = nutrition.calories;
        payload.protein = nutrition.protein;
        payload.carbs = nutrition.carbs;
        payload.fat = nutrition.fat;
        payload.nutrition_description = nutrition.description;
        payload.nutrition_estimated = true;
      }

      const { error: insertError } = await supabase
        .from("list_items")
        .insert(payload);

      setAdding(false);

      if (insertError) {
        setError(insertError.message);
        setState("error");
        return;
      }

      setState("added");
      // Reset after a short delay
      setTimeout(() => {
        setState("idle");
        setPreview(null);
        setItem(null);
        setNutrition(null);
        setNutritionExpanded(false);
      }, 2000);
    },
    [
      supabase,
      userId,
      editName,
      editQuantity,
      editNote,
      editCategory,
      nutrition,
    ]
  );

  const handleAddButton = useCallback(() => {
    if (lists.length === 0) {
      setError("You need to create a list first before adding items.");
      return;
    }
    if (lists.length === 1) {
      handleAddToList(lists[0].id);
    } else {
      setShowListPicker(true);
    }
  }, [lists, handleAddToList]);

  const handleDiscard = useCallback(() => {
    setState("idle");
    setPreview(null);
    setItem(null);
    setNutrition(null);
    setNutritionExpanded(false);
    setError(null);
  }, []);

  const handleTakePhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isFood = FOOD_CATEGORIES.includes(editCategory);

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Hidden file input with camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Scan product</h1>
        <p className="text-sm text-gray-500">
          Take a photo of a grocery item to identify and add it.
        </p>
      </div>

      {/* === IDLE STATE === */}
      {state === "idle" && (
        <div className="flex flex-col items-center gap-4">
          {/* Camera button */}
          <button
            onClick={handleTakePhoto}
            className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 transition-colors hover:border-green-400 hover:bg-green-100 active:bg-green-200"
          >
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
              />
            </svg>
            <span className="text-sm font-semibold text-green-700">
              Take photo
            </span>
          </button>

          {/* Upload from gallery */}
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100">
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
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
              />
            </svg>
            Choose from gallery
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* === LOADING STATE === */}
      {state === "loading" && (
        <div className="flex flex-col items-center gap-4">
          {preview && (
            <div className="w-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Captured product"
                className="h-48 w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
            <p className="text-sm font-medium text-gray-600">
              Identifying product...
            </p>
          </div>
        </div>
      )}

      {/* === RESULT STATE — Confirmation Card === */}
      {state === "result" && item && (
        <div className="flex flex-col gap-4">
          {/* Photo preview */}
          {preview && (
            <div className="w-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Captured product"
                className="h-40 w-full object-cover"
              />
            </div>
          )}

          {/* Confidence indicator */}
          {item.confidence < 0.6 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
              <svg
                className="h-5 w-5 flex-shrink-0 text-amber-500"
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
              <p className="text-xs text-amber-700">
                Low confidence — please check the details below.
              </p>
            </div>
          )}

          {/* Editable fields */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Identified item
            </h2>

            <div className="flex flex-col gap-3">
              {/* Name */}
              <div>
                <label
                  htmlFor="scanName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="scanName"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* Quantity + Category */}
              <div className="flex gap-3">
                <div className="w-24">
                  <label
                    htmlFor="scanQty"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Qty
                  </label>
                  <input
                    id="scanQty"
                    type="text"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="scanCategory"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>
                  <select
                    id="scanCategory"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label
                  htmlFor="scanNote"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Note{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="scanNote"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Био, от Лидл"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-400">Confidence</span>
              <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${
                    item.confidence >= 0.8
                      ? "bg-green-500"
                      : item.confidence >= 0.5
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${Math.round(item.confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500">
                {Math.round(item.confidence * 100)}%
              </span>
            </div>

            {/* === Nutrition section (food items only) === */}
            {isFood && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <button
                  onClick={() => setNutritionExpanded(!nutritionExpanded)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4 text-gray-400"
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
                    <span className="text-xs font-medium text-gray-500">
                      Nutrition info
                    </span>
                    {nutritionLoading && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                    )}
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${nutritionExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>

                {nutritionExpanded && (
                  <div className="mt-2">
                    {nutritionLoading ? (
                      <div className="flex items-center gap-2 py-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-200 border-t-green-600" />
                        <span className="text-xs text-gray-400">
                          Loading nutrition data...
                        </span>
                      </div>
                    ) : nutrition ? (
                      <div>
                        {/* 2x2 stat grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-xs text-gray-400">
                              Calories
                            </div>
                            <div className="text-sm font-semibold text-gray-800">
                              {nutrition.calories}{" "}
                              <span className="font-normal text-gray-400">
                                kcal
                              </span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-xs text-gray-400">
                              Protein
                            </div>
                            <div className="text-sm font-semibold text-gray-800">
                              {nutrition.protein}
                              <span className="font-normal text-gray-400">
                                g
                              </span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-xs text-gray-400">Carbs</div>
                            <div className="text-sm font-semibold text-gray-800">
                              {nutrition.carbs}
                              <span className="font-normal text-gray-400">
                                g
                              </span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-xs text-gray-400">Fat</div>
                            <div className="text-sm font-semibold text-gray-800">
                              {nutrition.fat}
                              <span className="font-normal text-gray-400">
                                g
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Description */}
                        {nutrition.description && (
                          <p className="mt-2 text-xs text-gray-500">
                            {nutrition.description}
                          </p>
                        )}
                        {/* Estimated label */}
                        <p className="mt-1.5 text-[10px] text-gray-300 italic">
                          ~ estimated per 100g
                        </p>
                      </div>
                    ) : (
                      <p className="py-2 text-xs text-gray-400">
                        Nutrition data unavailable.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              Discard
            </button>
            <button
              onClick={handleAddButton}
              disabled={adding || !editName.trim()}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add to list"}
            </button>
          </div>

          {/* Retake photo */}
          <button
            onClick={handleTakePhoto}
            className="text-center text-sm font-medium text-green-600 hover:text-green-700"
          >
            Retake photo
          </button>
        </div>
      )}

      {/* === ADDED STATE — Success === */}
      {state === "added" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-green-200 bg-green-50 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
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
          </div>
          <h2 className="text-base font-semibold text-green-800">
            Item added!
          </h2>
          <p className="text-sm text-green-600">
            The item has been added to your list.
          </p>
        </div>
      )}

      {/* === ERROR STATE === */}
      {state === "error" && (
        <div className="flex flex-col items-center gap-4">
          {preview && (
            <div className="w-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Captured product"
                className="h-40 w-full object-cover opacity-60"
              />
            </div>
          )}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-6 text-center">
            <svg
              className="h-8 w-8 text-red-400"
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
          <div className="flex w-full gap-3">
            <button
              onClick={handleDiscard}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleTakePhoto}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-green-700"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* === LIST PICKER MODAL === */}
      {showListPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-8 sm:rounded-2xl sm:pb-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Add to which list?
            </h2>
            <div className="flex flex-col gap-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToList(list.id)}
                  className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                >
                  {list.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowListPicker(false)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
