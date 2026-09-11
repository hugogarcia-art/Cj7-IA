"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from 'next/link';
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, ShoppingBag, ShoppingCart, DollarSign, TrendingUp, Bot,
  Settings, Megaphone, Box, BarChart3, MessageSquare,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

type Metrics = {
  salesToday: number;
  revenueToday: number;
  salesMonth: number;
  revenueMonth: number;
  revenueTotal: number;
  ticketAverage: number;
  newClients: number;
  totalSales: number;
};

type Sale = {
  id: string;
  total: number;
  status: string;
  notes?: string;
  createdAt: string;
  client: { id: string; name: string; phone: string };
};

type Message = {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [metricsRes, salesRes, messagesRes] = await Promise.all([
        fetch(`${API}/sales/metrics`, { headers }),
        fetch(`${API}/sales`, { headers }),
        fetch(`${API}/clients/messages/recent`, { headers }),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(Array.isArray(data) ? data : []);
      }
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setRecentMessages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error al cargar métricas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Últimas 5 ventas para el mini-pipeline
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

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
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-medium text-sm">
                <LayoutDashboard size={18} /> Dashboard
              </button>

              <Link href="/dashboard/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Users size={18} /> CRM Clientes
              </Link>

              <Link href="/dashboard/ventas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <ShoppingBag size={18} /> Ventas
              </Link>
              <Link href="/dashboard/inventario" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Box size={18} /> Inventario
              </Link>
              <Link href="/dashboard/campanas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Megaphone size={18} /> Campañas WhatsApp
              </Link>
              <Link href="/dashboard/analitica" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <BarChart3 size={18} /> Analítica
              </Link>
            </nav>
          </div>
          <Link href="/dashboard/perfil" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
            <Settings size={18} /> Mi Perfil
          </Link>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold">¡Bienvenido de nuevo! 👋</h2>
            <p className="text-gray-500 mt-1">Datos reales de tu negocio, en tiempo real.</p>
          </div>
          <Link href="/dashboard/campanas" className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2">
            <TrendingUp size={18} /> Crear Campaña
          </Link>
        </div>

        {/* Tarjetas de Estadísticas — DATOS REALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            /* Esqueletos mientras carga */
            [1, 2, 3, 4].map((n) => (
              <div key={n} className="glass rounded-3xl p-6 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700 mb-4" />
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))
          ) : metrics ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-3xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-600">
                    <DollarSign size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">
                  {metrics.revenueMonth.toLocaleString("es-BO")} Bs
                </h3>
                <p className="text-gray-500 text-sm">Ingresos del Mes</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-3xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <ShoppingBag size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">{metrics.salesToday}</h3>
                <p className="text-gray-500 text-sm">Ventas Hoy</p>
                <p className="text-xs text-gray-400 mt-1">{metrics.totalSales} ventas totales</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-3xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
                    <Users size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">{metrics.newClients}</h3>
                <p className="text-gray-500 text-sm">Clientes Nuevos (mes)</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-3xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-600">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">
                  {metrics.ticketAverage.toLocaleString("es-BO")} Bs
                </h3>
                <p className="text-gray-500 text-sm">Ticket Promedio</p>
                <p className="text-xs text-gray-400 mt-1">
                  Total histórico: {metrics.revenueTotal.toLocaleString("es-BO")} Bs
                </p>
              </motion.div>
            </>
          ) : (
            <div className="glass rounded-3xl p-6 col-span-full text-center text-gray-500">
              No se pudieron cargar las métricas.
            </div>
          )}
        </div>

        {/* Dos columnas: Últimas ventas + Actividad IA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Últimas ventas REALES */}
          <div className="glass rounded-3xl p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Últimas Ventas</h3>
              <Link href="/dashboard/ventas" className="text-primary text-sm font-medium hover:underline">
                Ver Pipeline completo →
              </Link>
            </div>
            {recentSales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aún no hay ventas registradas.</p>
                <Link href="/dashboard/ventas" className="text-primary text-sm font-medium hover:underline">
                  Registrar la primera →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between bg-white/50 dark:bg-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <DollarSign size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sale.client?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{sale.notes || "Venta"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-primary">{sale.total} Bs</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sale.status === "Cancelado" ? "bg-red-500/10 text-red-500"
                        : sale.status === "Completado" ? "bg-green-500/10 text-green-600"
                        : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="glass rounded-3xl p-6">
            <h3 className="text-xl font-bold mb-6">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Link href="/dashboard/clientes" className="flex items-center gap-3 bg-white/50 dark:bg-white/5 rounded-2xl p-4 hover:bg-primary/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Users size={18} /></div>
                <div>
                  <p className="font-medium text-sm">Gestionar Clientes</p>
                  <p className="text-xs text-gray-400">Tu CRM completo</p>
                </div>
              </Link>
              <Link href="/dashboard/campanas" className="flex items-center gap-3 bg-white/50 dark:bg-white/5 rounded-2xl p-4 hover:bg-primary/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Megaphone size={18} /></div>
                <div>
                  <p className="font-medium text-sm">Enviar Campaña</p>
                  <p className="text-xs text-gray-400">Ofertas masivas</p>
                </div>
              </Link>
              <Link href="/dashboard/inventario" className="flex items-center gap-3 bg-white/50 dark:bg-white/5 rounded-2xl p-4 hover:bg-primary/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Box size={18} /></div>
                <div>
                  <p className="font-medium text-sm">Inventario</p>
                  <p className="text-xs text-gray-400">Tu catálogo para la IA</p>
                </div>
              </Link>
              <Link href="/dashboard/clientes" className="flex items-center gap-3 bg-white/50 dark:bg-white/5 rounded-2xl p-4 hover:bg-primary/5 transition-colors">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><MessageSquare size={18} /></div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Mensajes recientes</p>
                  <p className="text-xs text-gray-400">
                    {recentMessages.length > 0
                      ? `${recentMessages.length} mensajes recientes`
                      : "Sin mensajes todavía"}
                  </p>
                  {recentMessages.slice(0, 2).map((message) => (
                    <p key={message.id} className="text-xs text-gray-500 truncate mt-1">
                      <span className="font-medium">
                        {message.sender === "ai" ? "IA" : "Cliente"}:
                      </span>{" "}
                      {message.content}
                    </p>
                  ))}
                </div>
              </Link>
              <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600"><Bot size={18} /></div>
                <div>
                  <p className="font-medium text-sm">Agente IA</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Activo 24/7
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}