"use client";

import AddUsualItemModal from "@/components/AddUsualItemModal";
import CreateListModal from "@/components/CreateListModal";
import JoinListModal from "@/components/JoinListModal";
import ListCard from "@/components/ListCard";
import PickListModal from "@/components/PickListModal";
import UsualItemChip from "@/components/UsualItemChip";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ListData {
  id: string;
  name: string;
  join_code: string;
  item_count: number;
  member_count: number;
}

interface UsualItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
}

export default function ListsClient({
  displayName,
  userId,
  lists,
  usualItems,
}: {
  displayName: string;
  userId: string;
  lists: ListData[];
  usualItems: UsualItem[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showAddUsual, setShowAddUsual] = useState(false);
  const [editingUsuals, setEditingUsuals] = useState(false);
  const [pickListFor, setPickListFor] = useState<{
    name: string;
    quantity: string;
    category: string;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleAddUsualToList(
    item: { name: string; quantity: string; category: string },
    listId?: string
  ) {
    // If only one list, add directly
    if (lists.length === 1 && !listId) {
      listId = lists[0].id;
    } else if (lists.length > 1 && !listId) {
      // Show picker
      setPickListFor(item);
      return;
    } else if (lists.length === 0) {
      return; // No lists to add to
    }

    const { error } = await supabase.from("list_items").insert({
      list_id: listId,
      added_by: userId,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
    });

    if (!error) {
      router.refresh();
    }
  }

  async function handleDeleteUsual(id: string) {
    await supabase.from("usual_items").delete().eq("id", id);
    router.refresh();
  }

  function handlePickList(listId: string) {
    if (pickListFor) {
      handleAddUsualToList(pickListFor, listId);
      setPickListFor(null);
    }
  }

  return (
    <div className="px-4 pt-12">
      <header className="mb-6">
        <p className="text-sm text-gray-500">Hello, {displayName}</p>
        <h1 className="text-2xl font-bold text-gray-900">Your Lists</h1>
      </header>

      {/* Action buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 active:bg-green-800"
        >
          + New List
        </button>
        <button
          onClick={() => setShowJoin(true)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          Join a List
        </button>
      </div>

      {/* Active Lists */}
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mb-3 text-4xl">🛒</div>
          <h2 className="mb-1 text-lg font-semibold text-gray-800">
            No lists yet
          </h2>
          <p className="text-sm text-gray-500">
            Create your first shopping list or join one with a code.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              id={list.id}
              name={list.name}
              joinCode={list.join_code}
              itemCount={list.item_count}
              memberCount={list.member_count}
            />
          ))}
        </div>
      )}

      {/* Usual Items section */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Usual Items</h2>
          <div className="flex gap-2">
            {usualItems.length > 0 && (
              <button
                onClick={() => setEditingUsuals(!editingUsuals)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                {editingUsuals ? "Done" : "Edit"}
              </button>
            )}
            <button
              onClick={() => setShowAddUsual(true)}
              className="text-xs font-medium text-green-600 hover:text-green-700"
            >
              + Add
            </button>
          </div>
        </div>

        {usualItems.length === 0 ? (
          <p className="text-xs text-gray-400">
            Save your staple items here for quick access.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {usualItems.map((item) => (
              <UsualItemChip
                key={item.id}
                id={item.id}
                name={item.name}
                quantity={item.quantity}
                category={item.category}
                onAdd={handleAddUsualToList}
                onDelete={handleDeleteUsual}
                showDelete={editingUsuals}
              />
            ))}
          </div>
        )}
        {!editingUsuals && usualItems.length > 0 && lists.length > 0 && (
          <p className="mt-2 text-[10px] text-gray-400">
            Tap an item to add it to{" "}
            {lists.length === 1 ? `"${lists[0].name}"` : "a list"}
          </p>
        )}
      </div>

      {/* Sign out */}
      <form action="/auth/signout" method="post" className="mt-8 text-center">
        <button
          type="submit"
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          Sign out
        </button>
      </form>

      {/* Modals */}
      {showCreate && (
        <CreateListModal onClose={() => setShowCreate(false)} />
      )}
      {showJoin && <JoinListModal onClose={() => setShowJoin(false)} />}
      {showAddUsual && (
        <AddUsualItemModal
          userId={userId}
          onClose={() => setShowAddUsual(false)}
          onAdded={() => {
            setShowAddUsual(false);
            router.refresh();
          }}
        />
      )}
      {pickListFor && (
        <PickListModal
          lists={lists.map((l) => ({ id: l.id, name: l.name }))}
          onPick={handlePickList}
          onClose={() => setPickListFor(null)}
        />
      )}
    </div>
  );
}
