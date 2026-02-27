"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-config";

export default function UploadAvatar() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      // 1. Create a unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `user_uploads/${fileName}`;

      // 2. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get the Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      // 4. Save the URL to your Postgres Table
      const { error: dbError } = await supabase
        .from("test_image") // Change this to your table name
        .insert({
          test_image_dropbox: publicUrl,
        });

      if (dbError) throw dbError;

      alert("Successfully uploaded and saved to DB!");
    } catch (error) {
      console.error("Error:", error);
      alert("Upload failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="font-bold">Upload Image</label>
      <input
        type="file"
        accept="image/*"
        onChange={uploadImage}
        disabled={loading}
      />
      {loading && <p>Processing...</p>}
    </div>
  );
}
