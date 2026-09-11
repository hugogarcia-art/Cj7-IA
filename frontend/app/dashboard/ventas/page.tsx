"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Plus, X, DollarSign, Trash2, TrendingUp,
} from "lucide-react";

type Sale = {
  id: string;
  total: number;
  status: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  client: { id: string; name: string; phone: string };
};

type Client = { id: string; name: string; phone: string };

const STATUSES = [
  "Nuevo",
  "Pendiente",
  "En Proceso",
  "Pagado",
  "Enviado",
  "Completado",
  "Cancelado",
];

const STATUS_COLORS: Record<string, string> = {
  Nuevo: "bg-blue-500",
  Pendiente: "bg-yellow-500",
  "En Proceso": "bg-orange-500",
  Pagado: "bg-green-500",
  Enviado: "bg-purple-500",
  Completado: "bg-emerald-600",
  Cancelado: "bg-red-500",
};

const API = "http://localhost:8765";

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: "",
    total: "",
    paymentMethod: "Efectivo",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const [salesRes, clientsRes] = await Promise.all([
        fetch(`${API}/sales`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const salesData = await salesRes.json();
      const clientsData = await clientsRes.json();
      setSales(Array.isArray(salesData) ? salesData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Agrupa ventas por estado para las columnas
  const salesByStatus = useMemo(() => {
    const grouped: Record<string, Sale[]> = {};
    for (const status of STATUSES) grouped[status] = [];
    for (const sale of sales) {
      if (grouped[sale.status]) grouped[sale.status].push(sale);
      else grouped["Nuevo"].push(sale);
    }
    return grouped;
  }, [sales]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/sales`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, total: Number(formData.total) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Error al crear la venta.");
        return;
      }
      setIsModalOpen(false);
      setFormData({ clientId: "", total: "", paymentMethod: "Efectivo", notes: "" });
      fetchData();
    } catch (error) {
      console.error("Error al crear venta:", error);
    }
  };

  // 🎯 EL PIPELINE: mover venta entre estados (arrastrar y soltar)
  const handleDrop = async (newStatus: string) => {
    if (!draggingId) return;
    const sale = sales.find((s) => s.id === draggingId);
    if (!sale || sale.status === newStatus) {
      setDraggingId(null);
      setDragOverColumn(null);
      return;
    }

    // Optimista: mueve en pantalla al instante
    setSales((prev) =>
      prev.map((s) => (s.id === draggingId ? { ...s, status: newStatus } : s)),
    );
    setDraggingId(null);
    setDragOverColumn(null);

    // Persiste en el backend
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/sales/${draggingId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        alert("Error al mover la venta. Se revertirá.");
        fetchData(); // revierte si falló
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar esta venta?")) {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API}/sales/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchData();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="text-primary" />
            <TrendingUp className="text-primary" />
            Pipeline de Ventas
          </h2>
          <p className="text-gray-500 mt-1">Arrastra las tarjetas entre columnas para mover ventas.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2">
          <Plus size={18} /> Nueva Venta
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-3xl p-8 text-center text-gray-500">Cargando pipeline...</div>
      ) : (
        /* El Kanban: 7 columnas arrastrables */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={() => handleDrop(status)}
              className={`w-72 shrink-0 bg-white/50 dark:bg-white/5 rounded-2xl p-3 transition-colors ${
                dragOverColumn === status ? "bg-primary/10 ring-2 ring-primary" : ""
              }`}
            >
              {/* Cabecera de columna */}
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{status}</h4>
                <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                  {salesByStatus[status]?.length || 0}
                </span>
              </div>

              {/* Tarjetas de venta */}
              <div className="space-y-2 min-h-25">
                {salesByStatus[status]?.map((sale) => (
                  <motion.div
                    key={sale.id}
                    draggable
                    onDragStart={() => setDraggingId(sale.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing ${
                      draggingId === sale.id ? "opacity-50" : "hover:shadow-md"
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{sale.client?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{sale.notes || "Sin detalles"}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-primary">{sale.total} Bs</span>
                      <span className="text-xs text-gray-400">{sale.paymentMethod}</span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Venta */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Nueva Venta</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Cliente *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Total (Bs) *</label>
                  <input type="number" step="0.01" required value={formData.total} onChange={(e) => setFormData({ ...formData, total: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="450" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Método de pago</label>
                  <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Efectivo">Efectivo</option>
                    <option value="QR">QR</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Notas</label>
                  <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. Zapatillas Nike Air Max" />
                </div>

                <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium mt-4 flex items-center justify-center gap-2">
                  <DollarSign size={16} /> Registrar Venta
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}