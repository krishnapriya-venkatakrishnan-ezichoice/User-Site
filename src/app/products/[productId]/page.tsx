import { supabase } from "@/lib/supabase";
import ProductPageClient from "@/components/productPageCom/productPageClient";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 0;

// Server-side function to fetch the product data
async function fetchProduct(productId: string) {
  const { data, error } = await supabase
    .from("offers")
    .select(`*, offerVariation(*), vendor_id(*)`)
    .eq("is_in_stock", true)
    .eq("id", productId);

  if (error) throw new Error(error.message);

  return data[0];
}

// Add the `generateMetadata` function to set the page metadata dynamically
export async function generateMetadata({
  params,
}: {
  params: { productId: string };
}) {
  const product = await fetchProduct(params.productId);

  if (!product) {
    return {
      title: "EziChoice - Product not found",
    };
  }

  const imageUrl = product?.offerVariation[0].img_url ?? `/logo.png`;
  console.log(product.offerVariation[0]?.img_url);

  return {
    title: `${product.name} - Product Details`,
    description:
      product.description || "Explore the best deals on our products.",
    openGraph: {
      title: `${product.name} - Product Details`,
      description: product.description || "Discover this amazing product!",
      images: [
        {
          url: imageUrl,
          alt: product.name,
        },
      ],
      type: "website", // Change from "product" to "website"
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} - Product Details`,
      description: product.description || "Discover this amazing product!",
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const product = await fetchProduct(params.productId);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center  bg-gray-50 p-4">
        <div className="bg-white p-8  text-center max-w-md">
          <Image
            src="/no-product.png"
            alt="No product found"
            width={80}
            height={80}
            className="mx-auto"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            Product Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            We couldn&#39;t find the product you&#39;re looking for. It may have
            been removed or is temporarily unavailable.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProductPageClient product={product} />
    </>
  );
}
