"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, MessageSquare, ShoppingCart, User,
  ArrowUpRight, ArrowDownLeft, Calendar, StickyNote,
} from "lucide-react";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  lastContact?: string;
  createdAt: string;
};

type Message = {
  id: string;
  phone: string;
  sender: string;
  content: string;
  createdAt: string;
};

type Sale = {
  id: string;
  total: number;
  status: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

// Contenido dentro de Suspense (requerido por useSearchParams en export estático)
function ClientDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [client, setClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; phone: string; sender: string; content: string; createdAt: string }>>([]);
  const [sales, setSales] = useState<Array<{ id: string; total: number; status: string; paymentMethod?: string; notes?: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "sales" | "info">("chat");

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [clientRes, messagesRes, salesRes] = await Promise.all([
        fetch(`${API}/clients/${id}`, { headers }),
        fetch(`${API}/clients/${id}/messages`, { headers }),
        fetch(`${API}/clients/${id}/sales`, { headers }),
      ]);

      if (clientRes.ok) {
        const data = await clientRes.json();
        setClient(data && !data.message ? data : null);
      }

      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(Array.isArray(data) ? data : []);
      }

      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error al cargar detalle:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  if (loading) {
    return <div className="min-h-screen bg-gradient-soft flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Cliente no encontrado.</p>
        <Link href="/dashboard/clientes" className="text-primary font-medium">Volver al CRM</Link>
      </div>
    );
  }

  const totalSpent = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <Link href="/dashboard/clientes" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al CRM
      </Link>

      {/* Cabecera del cliente */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold shadow-glow shrink-0">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
              <User size={20} className="text-primary" /> {client.name}
            </h2>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 justify-center md:justify-start">
              <span className="flex items-center gap-1"><Phone size={14} /> +{client.phone}</span>
              {client.email && <span className="flex items-center gap-1"><Mail size={14} /> {client.email}</span>}
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs">{client.status}</span>
            </div>
            {client.notes && (
              <p className="text-sm text-gray-500 mt-2 flex items-center justify-center md:justify-start gap-1">
                <StickyNote size={14} className="text-yellow-500" /> {client.notes}
              </p>
            )}
          </div>
          <div className="glass rounded-2xl px-6 py-3 text-center shrink-0">
            <p className="text-xs text-gray-400">Total comprado</p>
            <p className="text-2xl font-bold text-green-600">{totalSpent.toLocaleString("es-BO")} Bs</p>
            <p className="text-xs text-gray-400">{sales.length} {sales.length === 1 ? "compra" : "compras"}</p>
          </div>
        </div>
      </motion.div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6 flex-wrap justify-center md:justify-start">
        <button onClick={() => setTab("chat")} className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${tab === "chat" ? "bg-primary text-white" : "glass text-gray-600 dark:text-gray-300"}`}>
          <MessageSquare size={16} /> Conversaciones ({messages.length})
        </button>
        <button onClick={() => setTab("sales")} className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${tab === "sales" ? "bg-primary text-white" : "glass text-gray-600 dark:text-gray-300"}`}>
          <ShoppingCart size={16} /> Compras ({sales.length})
        </button>
        <button onClick={() => setTab("info")} className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${tab === "info" ? "bg-primary text-white" : "glass text-gray-600 dark:text-gray-300"}`}>
          <Calendar size={16} /> Información
        </button>
      </div>

      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-6">

        {tab === "chat" && (
          messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Sin conversaciones registradas aún.</p>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "ai" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === "ai"
                      ? "bg-white dark:bg-gray-800 rounded-bl-sm"
                      : "bg-green-500/20 rounded-br-sm"
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      {msg.sender === "ai" ? <><ArrowUpRight size={12} /> CJ7 IA</> : <><ArrowDownLeft size={12} /> Cliente</>}
                      · {new Date(msg.createdAt).toLocaleString("es-BO")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "sales" && (
          sales.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Sin compras registradas aún.</p>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{sale.notes || "Venta"}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar size={12} /> {new Date(sale.createdAt).toLocaleDateString("es-BO")} · {sale.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">{sale.total} Bs</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sale.status === "Cancelado" ? "bg-red-500/10 text-red-500" : sale.status === "Completado" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-500"}`}>
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "info" && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3">
              <Phone size={18} className="text-primary" />
              <div><p className="text-xs text-gray-400">Teléfono</p><p className="text-sm font-medium">+{client.phone}</p></div>
            </div>
            {client.email && (
              <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <Mail size={18} className="text-primary" />
                <div><p className="text-xs text-gray-400">Correo</p><p className="text-sm font-medium">{client.email}</p></div>
              </div>
            )}
            {client.tags && client.tags.length > 0 && (
              <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <User size={18} className="text-primary" />
                <div><p className="text-xs text-gray-400">Etiquetas</p>
                  <div className="flex gap-1 mt-1">{client.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">{t}</span>
                  ))}</div>
                </div>
              </div>
            )}
            <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3">
              <Calendar size={18} className="text-primary" />
              <div><p className="text-xs text-gray-400">Cliente desde</p><p className="text-sm font-medium">{new Date(client.createdAt).toLocaleDateString("es-BO")}</p></div>
            </div>
            {client.lastContact && (
              <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <MessageSquare size={18} className="text-primary" />
                <div><p className="text-xs text-gray-400">Último contacto</p><p className="text-sm font-medium">{new Date(client.lastContact).toLocaleString("es-BO")}</p></div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Suspense requerido por useSearchParams en export estático
export default function ClientDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center text-gray-500">Cargando...</div>
    }>
      <ClientDetailContent />
    </Suspense>
  );
}
