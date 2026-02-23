"use client";

import Link from "next/link";

interface ListCardProps {
  id: string;
  name: string;
  joinCode: string;
  itemCount: number;
  memberCount: number;
}

export default function ListCard({
  id,
  name,
  joinCode,
  itemCount,
  memberCount,
}: ListCardProps) {
  return (
    <Link
      href={`/lists/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md active:bg-gray-50"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-gray-900">{name}</h3>
        <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
          {joinCode}
        </span>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-gray-500">
        <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
        <span>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>
    </Link>
  );
}
