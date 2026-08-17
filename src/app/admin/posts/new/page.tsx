import { redirect } from "next/navigation";

export default function LegacyNewPostPage() {
  redirect("/admin/blog/new");
}
