import { createClient } from "@/lib/db/supabase-client";
import Image from "next/image";

export default async function GalleryPage() {
  const supabase = createClient();

  const { data: images, error } = await supabase
    .from("test_image")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    return <div>Error loading images: {error.message}</div>;
  }

  if (!images || images.length === 0) {
    return <div>No images found. Upload one first!</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
      {images.map((item) => (
        <div
          key={item.id}
          className="relative aspect-square w-full overflow-hidden rounded-lg border"
        >
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
