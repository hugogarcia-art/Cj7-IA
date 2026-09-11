"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, BarChart3, TrendingUp, Users, DollarSign, ShoppingCart,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Analytics = {
  salesTimeline: Array<{ date: string; total: number }>;
  byPaymentMethod: Array<{ method: string; total: number }>;
  byStatus: Array<{ status: string; count: number }>;
  topClients: Array<{ name: string; total: number }>;
};

const STATUS_COLORS: Record<string, string> = {
  Nuevo: "#3B82F6",
  Pendiente: "#EAB308",
  "En Proceso": "#F97316",
  Pagado: "#22C55E",
  Enviado: "#A855F7",
  Completado: "#10B981",
  Cancelado: "#EF4444",
};

const PIE_COLORS = ["#2563EB", "#22C55E", "#EAB308", "#A855F7", "#F97316"];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

export default function AnaliticaPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/sales/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (error) {
      console.error("Error al cargar analítica:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchAnalytics(), 0);
    return () => clearTimeout(t);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center text-gray-500">
        Cargando analítica...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">No se pudieron cargar los datos.</p>
        <Link href="/dashboard" className="text-primary font-medium">Volver al Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <BarChart3 size={32} className="text-primary" />
        <div>
          <h2 className="text-3xl font-bold">Analítica</h2>
          <p className="text-gray-500">Tus últimos 30 días de negocio, en un vistazo.</p>
        </div>
      </div>

      {/* 1. Línea de tiempo de ventas (30 días) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" /> Ventas — últimos 30 días (Bs)
        </h3>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.salesTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}
                formatter={(value) => {
                  const numericValue = Number(Array.isArray(value) ? value[0] : value ?? 0);
                  return [`${numericValue} Bs`, "Ventas"];
                }}
              />
              <Line type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* 2. Ingresos por método de pago */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-green-600" /> Ingresos por método de pago
          </h3>
          {analytics.byPaymentMethod.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin datos aún.</p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byPaymentMethod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                  <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => {
                      const numericValue = Number(Array.isArray(value) ? value[0] : value ?? 0);
                      return [`${numericValue} Bs`, "Ingresos"];
                    }}
                  />
                  <Bar dataKey="total" fill="#2563EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* 3. Distribución del Pipeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" /> Pipeline por estado
          </h3>
          {analytics.byStatus.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin datos aún.</p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.byStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {analytics.byStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* 4. Top clientes */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-3xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={20} className="text-primary" /> Top clientes por compras
        </h3>
        {analytics.topClients.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">Sin datos aún.</p>
        ) : (
          <div className="space-y-3">
            {analytics.topClients.map((client, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-600"
                  : i === 1 ? "bg-gray-500/20 text-gray-600"
                  : i === 2 ? "bg-orange-500/20 text-orange-600"
                  : "bg-primary/10 text-primary"
                }`}>
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{client.name}</span>
                    <span className="font-bold text-primary">{client.total} Bs</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(client.total / analytics.topClients[0].total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}
