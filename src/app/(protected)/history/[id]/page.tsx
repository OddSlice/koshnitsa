import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TripDetailClient from "./TripDetailClient";

interface SnapshotItem {
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: snapshot } = await supabase
    .from("list_snapshots")
    .select("id, list_name, store_name, completed_at, items")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!snapshot) notFound();

  return (
    <TripDetailClient
      snapshot={{
        id: snapshot.id,
        listName: snapshot.list_name,
        storeName: snapshot.store_name,
        completedAt: snapshot.completed_at,
        items: snapshot.items as SnapshotItem[],
      }}
      userId={user.id}
    />
  );
}
