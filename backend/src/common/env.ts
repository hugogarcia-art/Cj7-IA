/**
 * Lectura de variables de entorno con fallo temprano.
 *
 * Preferimos que el proceso no arranque a que arranque con un secreto vacío
 * y firme tokens que cualquiera pueda falsificar.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa tu .env (o las Environment Variables de Render).`,
    );
  }
  return value;
}

export function optionalEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

/** Lista separada por comas -> array sin vacíos. */
export function envList(name: string): string[] {
  return optionalEnv(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
