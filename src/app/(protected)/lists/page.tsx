import { createClient } from "@/lib/supabase/server";
import ListsClient from "./ListsClient";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

  // Fetch lists the user belongs to
  const { data: memberships } = await supabase
    .from("list_members")
    .select("list_id")
    .eq("user_id", user!.id);

  const listIds = memberships?.map((m) => m.list_id) ?? [];

  let lists: {
    id: string;
    name: string;
    join_code: string;
    item_count: number;
    member_count: number;
  }[] = [];

  if (listIds.length > 0) {
    // Only fetch non-archived lists
    const { data: listsData } = await supabase
      .from("lists")
      .select("id, name, join_code")
      .in("id", listIds)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (listsData) {
      const listsWithCounts = await Promise.all(
        listsData.map(async (list) => {
          const [{ count: itemCount }, { count: memberCount }] =
            await Promise.all([
              supabase
                .from("list_items")
                .select("*", { count: "exact", head: true })
                .eq("list_id", list.id),
              supabase
                .from("list_members")
                .select("*", { count: "exact", head: true })
                .eq("list_id", list.id),
            ]);

          return {
            id: list.id,
            name: list.name,
            join_code: list.join_code,
            item_count: itemCount ?? 0,
            member_count: memberCount ?? 0,
          };
        })
      );

      lists = listsWithCounts;
    }
  }

  // Fetch usual items
  const { data: usualItems } = await supabase
    .from("usual_items")
    .select("id, name, quantity, category")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  return (
    <ListsClient
      displayName={displayName}
      userId={user!.id}
      lists={lists}
      usualItems={usualItems ?? []}
    />
  );
}
