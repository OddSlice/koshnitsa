import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ListDetailClient from "./ListDetailClient";

interface ListItem {
  id: string;
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
  created_at: string;
  checked_at: string | null;
  added_by: string | null;
  checked_by: string | null;
}

export default async function ListDetailPage({
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

  // Check membership
  const { data: membership } = await supabase
    .from("list_members")
    .select("id")
    .eq("list_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  // Fetch list details
  const { data: list } = await supabase
    .from("lists")
    .select("id, name, join_code, created_by")
    .eq("id", id)
    .single();

  if (!list) notFound();

  // Fetch items
  const { data: items } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", id)
    .order("created_at", { ascending: true });

  // Fetch member count
  const { count: memberCount } = await supabase
    .from("list_members")
    .select("*", { count: "exact", head: true })
    .eq("list_id", id);

  return (
    <ListDetailClient
      list={{
        id: list.id,
        name: list.name,
        joinCode: list.join_code,
        memberCount: memberCount ?? 1,
      }}
      initialItems={(items as ListItem[]) ?? []}
      userId={user.id}
    />
  );
}
