"use client";

interface ListOption {
  id: string;
  name: string;
}

export default function PickListModal({
  lists,
  onPick,
  onClose,
}: {
  lists: ListOption[];
  onPick: (listId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-8 sm:rounded-2xl sm:pb-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Add to which list?
        </h2>

        <div className="flex flex-col gap-2">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onPick(list.id)}
              className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100"
            >
              {list.name}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
