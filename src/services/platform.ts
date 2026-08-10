/**
 * Platform detection + file access capabilities.
 * Keeps browser/native specifics out of components so Capacitor (Android) and
 * Tauri (desktop) implementations can be dropped in later.
 */
export type PlatformKind = "web" | "capacitor" | "tauri";

export function getPlatform(): PlatformKind {
  if (typeof window === "undefined") return "web";
  const w = window as unknown as Record<string, unknown>;
  if (w["__TAURI__"] || w["__TAURI_INTERNALS__"]) return "tauri";
  const cap = w["Capacitor"] as { isNativePlatform?: () => boolean } | undefined;
  if (cap?.isNativePlatform?.()) return "capacitor";
  return "web";
}

export function isNativePlatform(): boolean {
  return getPlatform() !== "web";
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Download a blob using the best available mechanism for the current platform. */
export async function saveBackupToFilesystem(filename: string, blob: Blob): Promise<"picker" | "download"> {
  if (supportsFileSystemAccess()) {
    try {
      const picker = (
        window as unknown as {
          showSaveFilePicker: (o: unknown) => Promise<{
            createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>;
          }>;
        }
      ).showSaveFilePicker;
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: "Trade Vault backup",
            accept: filename.endsWith(".csv") ? { "text/csv": [".csv"] } : { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "picker";
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") throw err;
      // fall through to plain download
    }
  }
  downloadBlob(filename, blob);
  return "download";
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ask the user for a backup file. Returns its text content. */
export async function pickBackupFile(accept = "application/json"): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ name: file.name, text: await file.text() });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
