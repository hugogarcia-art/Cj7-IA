"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Mail, Fingerprint, Venus, LayoutDashboard, Users, ShoppingBag, Box, Megaphone, BarChart3, Settings, Hash, Zap, User, LogOut } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { clearSession, useStoredUser } from "@/lib/auth";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  gender?: string;
  clientCode?: number;
  role: string;
};

export default function PerfilPage() {
  // Pintamos al instante lo que hay en localStorage para no dejar la pantalla
  // en blanco, y lo sustituimos por los datos frescos del servidor en cuanto
  // llegan (el perfil guardado puede estar desactualizado).
  const storedUser = useStoredUser();
  const [freshUser, setFreshUser] = useState<UserProfile | null>(null);
  const [automation, setAutomation] = useState<{ enabled: boolean; daysThreshold: number } | null>(null);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    apiFetch<UserProfile>("/auth/me")
      .then(setFreshUser)
      .catch((error: unknown) => {
        console.error("No se pudo actualizar el perfil:", error);
      });

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/automation/remarketing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data: { enabled: boolean; daysThreshold: number }) => setAutomation(data))
      .catch(() => console.error("Error al cargar automatización"));
  }, []);

  const toggleAutomation = async () => {
    if (!automation) return;
    setToggling(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/automation/remarketing`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: !automation.enabled,
          daysThreshold: automation.daysThreshold,
        }),
      });
      if (response.ok) {
        setAutomation({ ...automation, enabled: !automation.enabled });
      }
    } catch (error: unknown) {
      console.error("Error al cambiar automatización:", error);
    } finally {
      setToggling(false);
    }
  };

  const user = freshUser ?? (storedUser as UserProfile | null);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  if (!user) {
    return <div className="min-h-screen bg-gradient-soft flex items-center justify-center">Cargando...</div>;
  }

    // Obtenemos la inicial del nombre para el avatar
  const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-soft flex">
      
      {/* Sidebar (Barra Lateral) */}
      <aside className="w-64 p-4 hidden md:block">
        <div className="glass rounded-3xl h-full p-6 flex flex-col justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2 mb-8">
              <Bot size={24} /> CJ7 <span className="text-foreground">IA</span>
            </h1>
            <nav className="flex flex-col gap-2">
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <Link href="/dashboard/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Users size={18} /> CRM Clientes
              </Link>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <ShoppingBag size={18} /> Ventas
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Box size={18} /> Inventario
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Megaphone size={18} /> Meta Ads IA
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <BarChart3 size={18} /> Analítica
              </button>
            </nav>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/perfil" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-medium text-sm">
              <Settings size={18} /> Mi Perfil
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 text-sm transition-colors">
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal (Pantalla Completa) */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 w-full" // <-- Aquí le quité el max-w-4xl para que ocupe todo el ancho
        >
          {/* Cabecera del Perfil */}
          <div className="flex flex-col md:flex-row items-center gap-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-8 mb-8">
            <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold shadow-glow">
              {initial}
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h2 className="text-3xl font-bold">{user.fullName || user.username}</h2>
              </div>
              <p className="text-gray-500 mt-1 flex items-center justify-center md:justify-start gap-2">
                <User size={16} /> @{user.username}
              </p>
              <span className="inline-block mt-3 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </div>

          {/* Detalles del Perfil (Ocupando todo el ancho) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/50 dark:bg-white/5 p-6 rounded-2xl">
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Información Personal</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Correo Electrónico</p>
                    <p className="font-medium text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Venus size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Sexo</p>
                    <p className="font-medium text-sm">{user.gender || "No especificado"}</p>
                  </div>
                </div>
              </div>
            </div>

              <div className="bg-white/50 dark:bg-white/5 p-6 rounded-2xl">
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Datos del Sistema</h3>
              <div className="space-y-5">
                
                {/* ID de Usuario */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-500/10 text-gray-500 flex items-center justify-center">
                    <Fingerprint size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">ID Único de Usuario</p>
                    <p className="font-medium text-sm truncate text-gray-500">{user.id}</p>
                  </div>
                </div>

                {/* Código de Cliente en un pequeño rectángulo verde */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                    <Hash size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Código de Cliente</p>
                    {/* Aquí está el pequeño rectángulo visual alrededor del número */}
                    <span className="inline-block mt-1 px-3 py-1 rounded-lg bg-green-500/10 text-green-600 font-bold text-sm border border-green-500/20">
                      {user.clientCode}
                    </span>
                  </div>
                </div>

                <div className={`rounded-2xl p-4 border transition-colors ${
                  automation?.enabled
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-gray-500/10 border-gray-500/20"
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        automation?.enabled ? "bg-green-500/20 text-green-600" : "bg-gray-500/10 text-gray-500"
                      }`}>
                        <Zap size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Remarketing automático</p>
                        <p className={`font-medium text-sm ${automation?.enabled ? "text-green-600" : "text-gray-500"}`}>
                          {automation?.enabled ? `Activo cada ${automation.daysThreshold} días` : "Desactivado"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleAutomation}
                      disabled={toggling || !automation}
                      aria-label={automation?.enabled ? "Desactivar remarketing automático" : "Activar remarketing automático"}
                      aria-pressed={automation?.enabled ?? false}
                      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                        automation?.enabled ? "bg-green-500" : "bg-gray-400"
                      } ${toggling ? "opacity-50" : "cursor-pointer"}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          automation?.enabled ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {automation?.enabled && (
                    <p className="text-xs text-green-600/80 mt-2">
                      Tu IA contactará clientes sin respuesta cada {automation.daysThreshold} días
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}