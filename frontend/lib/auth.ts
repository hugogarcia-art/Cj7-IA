"use client";
import { useSyncExternalStore } from "react";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  gender?: string | null;
  bio?: string | null;
  clientCode?: number;
  role: string;
};

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  return parseUser(window.localStorage.getItem(USER_KEY));
}

export function saveSession(token: string, user: SessionUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notify();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notify();
}

// ─────────────────────────────────────────────────────────────────────────
// localStorage como "external store" de React.
//
// Leerlo con useEffect + setState dispara renders en cascada (y lo prohíbe
// el compilador de React). useSyncExternalStore es la vía prevista para
// datos que viven fuera de React, y de paso resuelve la hidratación: en el
// servidor no hay localStorage, así que el snapshot es `null`.
// ─────────────────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // "storage" avisa de cambios hechos en OTRA pestaña: si cierras sesión en
  // una, las demás se enteran.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null; // JSON corrupto: mejor tratarlo como "sin sesión" que romper el render.
  }
}

// getSnapshot debe devolver siempre la MISMA referencia mientras el valor no
// cambie, o React entra en un bucle de renders. Cacheamos por el texto crudo.
let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function getUserSnapshot(): SessionUser | null {
  const raw = window.localStorage.getItem(USER_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = parseUser(raw);
  }
  return cachedUser;
}

const getNullSnapshot = () => null;

/** `null` mientras no se sabe (SSR / primer render), luego `true` o `false`. */
export function useHasToken(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(TOKEN_KEY) !== null,
    getNullSnapshot,
  );
}

/** Usuario guardado en el navegador, reactivo a login/logout. */
export function useStoredUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, getUserSnapshot, getNullSnapshot);
}
