"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHasToken } from "@/lib/auth";

/**
 * Puerta de entrada al panel. Cubre /dashboard y todas sus subrutas, así que
 * ninguna página tiene que acordarse de comprobar la sesión por su cuenta.
 *
 * Es una comprobación de UX, no de seguridad: quien manda es el JwtAuthGuard
 * del backend, que rechaza cualquier petición sin token válido.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasToken = useHasToken();

  useEffect(() => {
    if (hasToken === false) router.replace("/login");
  }, [hasToken, router]);

  if (hasToken !== true) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  return <>{children}</>;
}
