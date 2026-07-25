import { useRef, useState } from "react";
import { apiRequest } from "../../services/apiClient";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Foto única para una entidad (mascota, turno, etc).
 * - Con `uploadPath`: sube inmediatamente al seleccionar el archivo.
 * - Sin `uploadPath`: guarda el archivo en memoria (dataURL) y lo pasa a
 *   `onFileStaged` para que el padre lo suba después (ej: alta de mascota,
 *   donde todavía no existe un id para armar la URL de subida).
 */
export default function PhotoUpload({
  photoUrl,
  uploadPath,
  onUploaded,
  onFileStaged,
  fallback,
  label,
  className,
  size = 64,
  rounded = true,
}) {
  const inputRef = useRef(null);
  const [stagedPreview, setStagedPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const displayUrl = stagedPreview || photoUrl;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato no permitido (usá JPEG, PNG o WEBP).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("La imagen supera el tamaño máximo de 4MB.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setStagedPreview(dataUrl);

    if (!uploadPath) {
      onFileStaged?.(dataUrl);
      return;
    }

    setUploading(true);
    try {
      const updated = await apiRequest(uploadPath, {
        method: "POST",
        body: { image: dataUrl },
      });
      onUploaded?.(updated);
    } catch (err) {
      setError(err.message || "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`photo-upload${className ? ` ${className}` : ""}`}>
      <div
        className="photo-upload__preview"
        style={{ width: size, height: size, borderRadius: rounded ? "50%" : "10px" }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="" className="photo-upload__image" />
        ) : (
          fallback
        )}
      </div>
      <div className="photo-upload__actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Subiendo…" : label || (displayUrl ? "Cambiar foto" : "Subir foto")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
      {error && <p className="photo-upload__error">{error}</p>}
    </div>
  );
}
