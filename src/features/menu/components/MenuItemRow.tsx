import Image from "next/image";
import type { MenuItemView } from "../types";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";

export function MenuItemRow({
  id,
  name,
  description,
  price,
  imageUrl,
  restaurantId = "restaurant-1",
}: MenuItemView) {
  return (
    <article className="group relative flex min-h-0 cursor-pointer gap-3 border-b border-char/10 bg-white px-1 py-4 transition last:border-b-0 focus-within:ring-4 focus-within:ring-tomato/25 md:min-h-44 md:flex-col md:justify-between md:gap-6 md:rounded-3xl md:border md:p-6 md:shadow-[0_18px_50px_rgba(43,36,32,0.08)] md:hover:-translate-y-1 md:hover:shadow-[0_24px_60px_rgba(43,36,32,0.14)]">
      <div className="min-w-0 flex-1">
        <span className="mb-2 hidden h-1 w-12 rounded-full bg-tomato transition-all group-hover:w-20 md:block" />
        <h4 className="text-base font-black uppercase tracking-wide text-char md:text-xl">{name}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-char/65 md:mt-2 md:text-sm md:leading-6">{description}</p>
        <span className="mt-2 block text-base font-black text-tomato md:mt-4 md:text-xl">€ {price.toFixed(2)}</span>
      </div>
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          width={112}
          height={112}
          className="h-24 w-24 shrink-0 rounded-xl object-cover md:h-28 md:w-full md:order-first md:rounded-2xl"
        />
      )}
      <AddToCartButton
        id={id}
        name={name}
        description={description}
        price={price}
        restaurantId={restaurantId}
      />
    </article>
  );
}
