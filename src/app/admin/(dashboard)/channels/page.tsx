import type { Metadata } from "next";
import { MarketplaceChannels } from "@/features/marketplaces/components/MarketplaceChannels";

export const metadata: Metadata = {
  title: "Delivery Channels | Grill Saloniki Admin",
};

export default function AdminChannelsPage() {
  return <MarketplaceChannels />;
}

