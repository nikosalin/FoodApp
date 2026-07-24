import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seedAdminState } from "@/features/admin/data/seed";
import { PublicMenu } from "@/features/menu/components/PublicMenu";
import { getPublicMenu } from "@/features/menu/data/menu";

type OrderType = "table" | "takeaway" | "delivery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = seedAdminState.restaurants.find(
    (candidate) => candidate.slug === slug,
  );
  return {
    title: restaurant
      ? `${restaurant.name} | Speisekarte`
      : "Speisekarte | FoodApp",
  };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ orderType?: string; table?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const restaurant = seedAdminState.restaurants.find(
    (candidate) =>
      candidate.slug === slug && candidate.status !== "blocked",
  );
  if (!restaurant) notFound();

  const initialOrderType = isOrderType(query.orderType)
    ? query.orderType
    : undefined;
  const initialTable =
    typeof query.table === "string" && /^[A-Za-z0-9-]{1,12}$/.test(query.table)
      ? query.table
      : undefined;

  return (
    <PublicMenu
      restaurant={restaurant}
      items={getPublicMenu(slug)}
      initialOrderType={initialOrderType}
      initialTable={initialTable}
    />
  );
}

function isOrderType(value: string | undefined): value is OrderType {
  return value === "table" || value === "takeaway" || value === "delivery";
}
