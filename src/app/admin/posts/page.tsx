import { redirect } from "next/navigation";

export default function LegacyAdminPostsPage() {
  redirect("/admin/blog");
}
