import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard-data";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { WidgetLayoutItem } from "@/lib/widgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // Koç girince danışan görünümüne düşer (standart kullanıcı panosu yerine).
  if (user.role === "coach") redirect("/coach");
  const data = await getDashboardData(user.id);
  const layout: WidgetLayoutItem[] = user.dashboardLayout
    ? JSON.parse(user.dashboardLayout.widgets)
    : [];
  return <DashboardGrid data={data} initialLayout={layout} />;
}
