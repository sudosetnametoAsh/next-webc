import { createClient } from "@/lib/supabase-config";
import Image from "next/image";

// Ensure this function creates a Server Client if you are using App Router
// (If your createClient is a singleton that works in components, this is fine)
export default async function GalleryPage() {
  const supabase = createClient();

  // 1. Fetch the rows containing the public URLs
  const { data: images, error } = await supabase
    .from("test_image") // Your table name
    .select("*")
    .order("id", { ascending: false }); // Get newest first

  if (error) {
    return <div>Error loading images: {error.message}</div>;
  }

  if (!images || images.length === 0) {
    return <div>No images found. Upload one first!</div>;
  }

  //   console.log(images);
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
      {images.map((item) => (
        <div
          key={item.id}
          className="relative aspect-square w-full overflow-hidden rounded-lg border"
        >
          {/* 2. Display the URL saved in the database */}
          <Image
            src={item.test_image_dropbox}
            alt="Uploaded image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={true}
          />
        </div>
      ))}
    </div>
  );
}
