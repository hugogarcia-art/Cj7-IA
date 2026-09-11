"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Megaphone, Plus, X, Trash2, Send,
  CheckCircle2, XCircle, Clock, Eye, Sparkles, ImageIcon, CalendarClock, Repeat,
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  message: string;
  audience: string;
  status: string;
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  createdAt: string;
  imageUrl?: string;
  scheduledAt?: string;
};

const AUDIENCES = [
  { value: "todos", label: "Todos los clientes" },
  { value: "Nuevo", label: "Estado: Nuevo" },
  { value: "VIP", label: "Estado: VIP" },
  { value: "En Proceso", label: "Estado: En Proceso" },
  { value: "Inactivo", label: "Estado: Inactivo" },
];

const API = "https://cj7-ia.onrender.com";

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: "", message: "", audience: "todos" });
  const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState(0);

  const fetchCampaigns = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar campañas:", error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchCampaigns(), 0);
    return () => clearTimeout(t);
  }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("message", formData.message);
      fd.append("audience", formData.audience);
      if (scheduleEnabled && scheduledAt) {
        fd.append("scheduledAt", new Date(scheduledAt).toISOString());
      }
      if (recurrenceDays > 0) {
        fd.append("recurrenceDays", String(recurrenceDays));
      }
      if (campaignImage) {
        fd.append("image", campaignImage);
      }

      const res = await fetch(`${API}/campaigns/advanced`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        alert("Error al crear la campaña.");
        return;
      }
      setIsModalOpen(false);
      setFormData({ name: "", message: "", audience: "todos" });
      setCampaignImage(null);
      setImagePreview(null);
      setScheduleEnabled(false);
      setScheduledAt("");
      setRecurrenceDays(0);
      fetchCampaigns();
    } catch (error) {
      console.error("Error al crear campaña:", error);
    }
  };

  const handleSend = async (campaign: Campaign) => {
    const confirmMsg = window.confirm(
      `¿Enviar la campaña "${campaign.name}" a la audiencia "${campaign.audience}"?\n\nSolo llegará a clientes con conversación activa (últimas 24h).`,
    );
    if (!confirmMsg) return;

    setSendingId(campaign.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Error al iniciar el envío.");
        return;
      }
      // Recarga en vivo mientras envía
      const interval = setInterval(fetchCampaigns, 5000);
      setTimeout(() => clearInterval(interval), 60000);
      fetchCampaigns();
    } catch (error) {
      console.error("Error al enviar campaña:", error);
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar esta campaña?")) {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API}/campaigns/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCampaigns();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  // Vista previa en vivo del mensaje
  const preview = useMemo(() => {
    return formData.message
      .replace(/{{\s*nombre\s*}}/gi, "Juan")
      .replace(/{{\s*producto\s*}}/gi, "Zapatillas Nike Air Max")
      .replace(/{{\s*precio\s*}}/gi, "450 Bs");
  }, [formData.message]);

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({ ...prev, message: prev.message + variable }));
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8 relative">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="text-primary" /> Campañas WhatsApp
          </h2>
          <p className="text-gray-500 mt-1">Recuerdos y ofertas masivas con variables dinámicas.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2">
          <Plus size={18} /> Nueva Campaña
        </button>
      </div>

      {/* Lista de campañas */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass rounded-3xl p-8 text-center text-gray-500">Cargando campañas...</div>
        ) : campaigns.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aún no tienes campañas.</p>
            <p className="text-gray-400 text-sm">Crea una para enviar ofertas y recuerdos a tus clientes.</p>
          </div>
        ) : (
          campaigns.map((campaign, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-3xl p-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold">{campaign.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      campaign.status === "completada" ? "bg-green-500/10 text-green-600"
                      : campaign.status === "enviando" ? "bg-yellow-500/10 text-yellow-600 animate-pulse"
                      : "bg-gray-500/10 text-gray-500"
                    }`}>
                      {campaign.status === "enviando" ? "📤 Enviando..." : campaign.status}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      👥 {campaign.audience}
                    </span>
                    {campaign.imageUrl && (
                      <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-medium">
                        🖼️ Con imagen
                      </span>
                    )}
                    {campaign.status === "programada" && campaign.scheduledAt && (
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        📅 {new Date(campaign.scheduledAt).toLocaleString("es-BO")}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-2">{campaign.message}</p>

                  {/* Estadísticas */}
                  <div className="flex gap-4 mt-3 flex-wrap text-xs">
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 size={14} /> {campaign.totalSent} enviados
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <XCircle size={14} /> {campaign.totalFailed} fallidos
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock size={14} /> {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSend(campaign)}
                    disabled={sendingId === campaign.id || campaign.status === "enviando"}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Send size={15} /> {sendingId === campaign.id ? "Enviando..." : "Enviar"}
                  </button>
                  <button onClick={() => handleDelete(campaign.id)} className="p-2.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Nueva Campaña */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Nueva Campaña</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Nombre de la campaña *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. Promo Nike Septiembre" />
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Audiencia *</label>
                  <select value={formData.audience} onChange={(e) => setFormData({ ...formData, audience: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary">
                    {AUDIENCES.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Mensaje *</label>
                  {/* Botones de variables dinámicas */}
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => insertVariable("{{nombre}}")} className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                      + Nombre
                    </button>
                    <button type="button" onClick={() => insertVariable("{{producto}}")} className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                      + Producto
                    </button>
                    <button type="button" onClick={() => insertVariable("{{precio}}")} className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                      + Precio
                    </button>
                  </div>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Hola {{nombre}}! Tenemos {{producto}} por solo {{precio}}..."
                  />
                </div>

                {/* Imagen de la campaña */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Imagen (opcional)</label>
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Vista previa"
                        width={64}
                        height={64}
                        unoptimized
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ImageIcon size={24} />
                      </div>
                    )}
                    <label className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5">
                      <ImageIcon size={14} /> Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCampaignImage(file);
                          setImagePreview(URL.createObjectURL(file));
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Programar envío */}
                <div className={`rounded-2xl p-4 border transition-colors ${
                  scheduleEnabled ? "bg-primary/5 border-primary/30" : "bg-gray-500/5 border-gray-500/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} className={scheduleEnabled ? "text-primary" : "text-gray-400"} />
                      <span className="text-sm font-medium">Programar envío</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScheduleEnabled(!scheduleEnabled)}
                      aria-pressed={scheduleEnabled}
                      className={`relative w-11 h-6 rounded-full transition-colors ${scheduleEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${scheduleEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  {scheduleEnabled && (
                    <input
                      type="datetime-local"
                      step="60"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full mt-3 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  )}
                </div>

                {/* Repetir campaña */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                    <Repeat size={14} /> Repetir campaña
                  </label>
                  <select
                    value={recurrenceDays}
                    onChange={(e) => setRecurrenceDays(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>No repetir (envío único)</option>
                    <option value={3}>Cada 3 días</option>
                    <option value={7}>Cada 7 días</option>
                    <option value={30}>Cada 30 días</option>
                  </select>
                </div>

                {/* Vista previa en vivo */}
                {formData.message && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                      <Eye size={14} /> Vista previa (cómo lo verá el cliente)
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm">
                      {preview}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-700 dark:text-yellow-400">
                  ⚠️ Con el número de prueba, solo recibirán el mensaje los números en tu lista autorizada de Meta.
                </div>

                <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium mt-4 flex items-center justify-center gap-2">
                  <Sparkles size={16} /> Crear Campaña
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
