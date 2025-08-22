import { createSessionClient } from "@/lib/supabase-ssr/server";
import { moveTempToPermStorage } from "@/utils/actions/storage";
import { redirect } from "next/navigation";

export default async function FileUploadPage(){

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  
  if (!data.user)
    return <div>Authentication Failed.</div>
  
  await moveTempToPermStorage(supabase);
  
  redirect("/auth/login");
  
}