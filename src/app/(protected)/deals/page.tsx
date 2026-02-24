import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DealsClient from "./DealsClient";

export default async function DealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user's active (non-archived) lists
  const { data: memberships } = await supabase
    .from("list_members")
    .select("list_id")
    .eq("user_id", user.id);

  let lists: { id: string; name: string }[] = [];

  if (memberships && memberships.length > 0) {
    const listIds = memberships.map((m) => m.list_id);
    const { data: userLists } = await supabase
      .from("lists")
      .select("id, name")
      .in("id", listIds)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (userLists) lists = userLists;
  }

  return <DealsClient userId={user.id} initialLists={lists} />;
}
