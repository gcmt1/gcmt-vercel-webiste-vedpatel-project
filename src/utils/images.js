export async function imageExtension(file) {
  const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer());
  const signature = Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  if (file.type==="image/jpeg" && signature.startsWith("ffd8ff")) return "jpg";
  if (file.type==="image/png" && signature.startsWith("89504e470d0a1a0a")) return "png";
  if (file.type==="image/webp" && signature.startsWith("52494646") && signature.slice(16)==="57454250") return "webp";
  throw new Error("Choose a JPEG, PNG or WebP image with a matching file type.");
}
