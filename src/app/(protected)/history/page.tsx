import { createClient } from "@/lib/supabase/server";
import HistoryClient from "./HistoryClient";

interface SnapshotItem {
  name: string;
  quantity: string;
  note: string | null;
  category: string;
  is_checked: boolean;
}

interface Snapshot {
  id: string;
  list_name: string;
  store_name: string | null;
  completed_at: string;
  items: SnapshotItem[];
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: snapshots } = await supabase
    .from("list_snapshots")
    .select("id, list_name, store_name, completed_at, items")
    .eq("user_id", user!.id)
    .order("completed_at", { ascending: false });

  return <HistoryClient snapshots={(snapshots as Snapshot[]) ?? []} />;
}
