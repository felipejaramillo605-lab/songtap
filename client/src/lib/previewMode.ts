import { useSyncExternalStore } from "react";

export type PreviewRole = "manager" | "staff";
export type PreviewMode = { role: PreviewRole; venueId: number; venueName?: string };

const previewStorageKey = "songtap-owner-preview-mode";
const previewEvent = "songtap-owner-preview-change";
let cachedRaw: string | null | undefined;
let cachedPreviewMode: PreviewMode | null = null;

export function getPreviewMode(): PreviewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(previewStorageKey);
    if (raw === cachedRaw) return cachedPreviewMode;
    cachedRaw = raw;
    if (!raw) {
      cachedPreviewMode = null;
      return cachedPreviewMode;
    }
    const parsed = JSON.parse(raw) as PreviewMode;
    cachedPreviewMode = (parsed.role === "manager" || parsed.role === "staff") && Number.isInteger(parsed.venueId) ? parsed : null;
    return cachedPreviewMode;
  } catch {
    cachedRaw = undefined;
    cachedPreviewMode = null;
    return null;
  }
}

function emitPreviewChange() {
  window.dispatchEvent(new Event(previewEvent));
}

export function setPreviewMode(mode: PreviewMode) {
  window.sessionStorage.setItem(previewStorageKey, JSON.stringify(mode));
  emitPreviewChange();
}

export function clearPreviewMode() {
  window.sessionStorage.removeItem(previewStorageKey);
  emitPreviewChange();
}

function subscribe(callback: () => void) {
  window.addEventListener(previewEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(previewEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function usePreviewMode() {
  return useSyncExternalStore(subscribe, getPreviewMode, () => null);
}
