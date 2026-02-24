import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ScanClient from "./ScanClient";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ScanClient userId={user.id} />;
}
