/**
 * Cliente HTTP único de la app.
 *
 * Antes la URL de producción estaba escrita a mano en 13 sitios, así que no
 * había forma de apuntar a un backend local sin editar código. Ahora sale de
 * NEXT_PUBLIC_API_URL y aquí mismo se adjunta el token de sesión.
 */
import { clearSession, getToken } from "./auth";

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Vacio = mismo origen. Es lo normal en produccion, donde NestJS sirve tanto
  // la aplicacion como la API, asi que basta con rutas relativas.
  if (trimmed === "") return "";
  // Es facil pegar "mi-api.onrender.com" sin esquema en el panel de Render;
  // sin protocolo, fetch lo trata como ruta relativa y falla en silencio.
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

// En desarrollo el frontend corre en :3000 y el backend en :8765, asi que hace
// falta la URL completa (va en .env.local). En produccion se deja vacia.
export const API_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Por defecto adjunta el Bearer token; ponlo en false para login/registro. */
  auth?: boolean;
};

async function parseError(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;
    // Nest devuelve un array de mensajes cuando falla la validación.
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return `Error ${response.status}`;
}

export async function apiFetch<T>(
  path: string,
  { body, auth = true, headers, ...init }: ApiOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  // FormData debe viajar sin Content-Type para que el navegador ponga el boundary.
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: finalHeaders,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // El token caducó o ya no vale. Solo borramos la sesión: el store avisa a
    // useHasToken(), el layout del dashboard lo ve y redirige con el router.
    // Así la navegación se queda del lado de React, no de window.location.
    clearSession();
    throw new ApiError("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Descarga un archivo protegido.
 *
 * Un <a href> no puede mandar el header Authorization, así que traemos el
 * blob con fetch y disparamos la descarga desde memoria.
 */
export async function apiDownload(path: string, fileName: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
