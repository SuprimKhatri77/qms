import type { Metadata } from "next";
import { JoinPage } from "@/modules/join";
import { getPublicShopFromApi } from "@/modules/join/api/get-public-shop.server";

type PageProps = {
  params: Promise<{ shopSlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shopSlug } = await params;
  const shop = await getPublicShopFromApi(shopSlug);
  return { title: `Join the queue at ${shop.name}` };
}

export default async function Page({ params }: PageProps) {
  const { shopSlug } = await params;
  const shop = await getPublicShopFromApi(shopSlug);

  return <JoinPage shop={shop} />;
}
