"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Users, Plus, ArrowLeft, Phone, Mail, X, Pencil, Trash2, Search,
  Smartphone, Upload, Download, FileSpreadsheet, MessageSquare, ShoppingCart,
  Calendar, User,
} from "lucide-react";
import { apiDownload, apiFetch } from "@/lib/api";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  tags?: string[];
  createdAt: string;
  notes?: string;
  lastContact?: string;
};

type ClientMessage = {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
};

type ClientSale = {
  id: string;
  total: number;
  status: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", status: "Nuevo", tags: "", notes: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailMessages, setDetailMessages] = useState<ClientMessage[]>([]);
  const [detailSales, setDetailSales] = useState<ClientSale[]>([]);
  const [detailTab, setDetailTab] = useState<"chat" | "sales" | "info">("chat");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const data = await apiFetch<Client[]>("/clients");
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // schedule fetch asynchronously to avoid setting state synchronously within the effect
    const t = setTimeout(() => void fetchClients(), 0);
    return () => clearTimeout(t);
  }, [fetchClients]);

  // Lógica de búsqueda y segmentación
  // Lógica de búsqueda y segmentación
  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return []; // Protección extra
    if (!searchTerm) return clients;
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clients, searchTerm]);


  const openNewModal = () => {
    setEditingClient(null);
    setFormData({ name: "", phone: "", email: "", status: "Nuevo", tags: "", notes: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({ 
      name: client.name, 
      phone: client.phone, 
      email: client.email || "", 
      status: client.status || "Nuevo",
      tags: client.tags?.join(", ") || "",
      notes: client.notes || "" // <-- AÑADE ESTO
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este cliente?")) {
      try {
        await apiFetch(`/clients/${id}`, { method: "DELETE" });
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        void fetchClients();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar.");
      }
    }
  };

  const openDetailModal = async (client: Client) => {
    setDetailClient(client);
    setDetailMessages([]);
    setDetailSales([]);
    setDetailTab("chat");
    setDetailLoading(true);
    setDetailError(null);

    try {
      const [messages, sales] = await Promise.all([
        apiFetch<ClientMessage[]>(`/clients/${client.id}/messages`),
        apiFetch<ClientSale[]>(`/clients/${client.id}/sales`),
      ]);
      setDetailMessages(Array.isArray(messages) ? messages : []);
      setDetailSales(Array.isArray(sales) ? sales : []);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      setDetailError("No se pudo cargar el historial de este cliente.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailClient(null);
    setDetailError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(Boolean);
    const payload = { ...formData, tags: tagsArray };

    try {
      await apiFetch(
        editingClient ? `/clients/${editingClient.id}` : "/clients",
        { method: editingClient ? "PUT" : "POST", body: payload },
      );

      setIsModalOpen(false);
      void fetchClients();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar el cliente.",
      );
    }
  };

  const handleImport = async () => {
    try {
      const data = await apiFetch<{
        imported: number;
        skipped: number;
        errors: number;
      }>("/clients/import", { method: "POST", body: { rawText: importText } });

      setImportResult(data);
      void fetchClients(); // Recarga la tabla con los nuevos
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al importar.");
    }
  };

    const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length && filteredClients.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map((c) => c.id));
    }
  };
  const idsQuery = selectedIds.length > 0 ? `?ids=${selectedIds.join(",")}` : "";
  const today = new Date().toISOString().split("T")[0];

  // Las descargas van por fetch (no por <a href>) porque necesitan el header
  // Authorization, que un enlace normal no puede enviar.
  const handleExport = async (format: "vcard" | "csv") => {
    const extension = format === "vcard" ? "vcf" : "csv";
    try {
      await apiDownload(
        `/clients/export/${format}${idsQuery}`,
        `contactos-cj7-${today}.${extension}`,
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo exportar.");
    }
  };

  const handleDownloadVCard = async (client: Client) => {
    try {
      await apiDownload(
        `/clients/${client.id}/vcard`,
        `${client.name.replace(/[^\w.-]+/g, "_")}.vcf`,
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo descargar.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8 relative">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-primary" /> CRM Clientes
          </h2>
          <p className="text-gray-500 mt-1">Gestiona, edita y segmenta tus clientes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExport("vcard")}
            className="border border-primary text-primary px-6 py-3 rounded-xl hover:bg-primary/10 transition-transform font-medium text-sm flex items-center gap-2"
          >
            <Download size={18} /> {selectedIds.length > 0 ? `Exportar (${selectedIds.length})` : "Exportar Todos"}
          </button>
          <button
            onClick={() => void handleExport("csv")}
            title="Descargar CSV para Excel"
            className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-transform font-medium text-sm flex items-center gap-2"
          >
            <FileSpreadsheet size={18} /> CSV
          </button>
          <button onClick={() => setIsImportOpen(true)} className="border border-primary text-primary px-6 py-3 rounded-xl hover:bg-primary/10 transition-transform font-medium text-sm flex items-center gap-2">
            <Upload size={18} /> Importar
          </button>
          <button onClick={openNewModal} className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2">
            <Plus size={18} /> Nuevo
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda / Segmentación */}
      <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nombre, teléfono o etiqueta..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none focus:outline-none w-full text-sm"
        />
      </div>

      <div className="glass rounded-3xl p-6 overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Cargando clientes...</p>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Bot size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aún no tienes clientes.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                <th className="py-4 px-4">
                  <input 
                    type="checkbox" 
                    checked={filteredClients.length > 0 && selectedIds.length === filteredClients.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Nombre</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Contacto</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Etiquetas</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Estado</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Registro</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <motion.tr key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-gray-200/30 dark:border-gray-700/30 hover:bg-primary/5">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(client.id)}
                      onChange={() => toggleSelect(client.id)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="py-4 px-4 font-medium">
                    <button onClick={() => void openDetailModal(client)} className="hover:text-primary transition-colors text-left">
                      {client.name}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-gray-500 text-sm">
                    <div className="flex items-center gap-2"><Phone size={14} /> {client.phone}</div>
                    {client.email && <div className="flex items-center gap-2 mt-1"><Mail size={14} /> {client.email}</div>}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {client.tags?.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 rounded-md bg-gray-500/10 text-gray-600 dark:text-gray-300 text-xs font-medium">
                      {client.status || "Nuevo"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-500 text-sm">
                    {new Date(client.createdAt).toLocaleDateString("es-BO")}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => void handleDownloadVCard(client)}
                        title="Guardar en mi celular"
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <Smartphone size={16} />
                      </button>
                      <button onClick={() => openEditModal(client)} className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Nombre completo</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. María García" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Teléfono (WhatsApp)</label>
                  <input type="text" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. 52123456789" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Correo electrónico (Opcional)</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. maria@correo.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Etiquetas (Separadas por comas)</label>
                  <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. VIP, Mayorista" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Estado</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Nuevo">Nuevo</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="VIP">VIP</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Observaciones / Notas internas</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Ej. Cliente prefiere que le llamen por la tarde." />
                </div>
                
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium mt-4">
                  {editingClient ? "Guardar Cambios" : "Guardar Cliente"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👇 PEGA AQUÍ EL MODAL DE IMPORTACIÓN 👇 */}
      <AnimatePresence>
        {isImportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => { setIsImportOpen(false); setImportResult(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Importar Contactos</h3>
                <button onClick={() => { setIsImportOpen(false); setImportResult(null); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              {importResult ? (
                <div className="text-center space-y-4">
                  <Users size={48} className="mx-auto text-green-500" />
                  <h4 className="text-xl font-bold">¡Importación completada!</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-500/10 rounded-xl p-4">
                      <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                      <p className="text-xs text-gray-500">Importados</p>
                    </div>
                    <div className="bg-yellow-500/10 rounded-xl p-4">
                      <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                      <p className="text-xs text-gray-500">Duplicados</p>
                    </div>
                    <div className="bg-red-500/10 rounded-xl p-4">
                      <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                      <p className="text-xs text-gray-500">Errores</p>
                    </div>
                  </div>
                  <button onClick={() => { setIsImportOpen(false); setImportResult(null); }} className="w-full bg-primary text-white py-3 rounded-xl font-medium mt-4">
                    ¡Listo!
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Pega tus contactos (uno por línea). Formato: <strong>Nombre, Teléfono</strong> o solo el teléfono.
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder={'Juan Pérez, 59167573862\nMaría García, 59170012345\n59169998777'}
                  />
                  <div className="flex gap-2 mt-4">
                    <label className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5">
                      <Upload size={16} /> Subir CSV
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setImportText(ev.target?.result as string);
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                    <button
                      onClick={handleImport}
                      disabled={!importText.trim()}
                      className="flex-1 bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Importar ahora
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 👆 HASTA AQUÍ 👆 */}

      <AnimatePresence>
        {detailClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={closeDetailModal}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="glass rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4 mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-glow shrink-0">
                    {detailClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-bold truncate">{detailClient.name}</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone size={12} /> +{detailClient.phone}</span>
                      {detailClient.email && <span className="flex items-center gap-1"><Mail size={12} /> {detailClient.email}</span>}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={closeDetailModal} aria-label="Cerrar detalle" className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <button type="button" onClick={() => setDetailTab("chat")} className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-colors ${detailTab === "chat" ? "bg-primary text-white" : "bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300"}`}>
                  <MessageSquare size={14} /> Chat ({detailMessages.length})
                </button>
                <button type="button" onClick={() => setDetailTab("sales")} className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-colors ${detailTab === "sales" ? "bg-primary text-white" : "bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300"}`}>
                  <ShoppingCart size={14} /> Compras ({detailSales.length})
                </button>
                <button type="button" onClick={() => setDetailTab("info")} className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-colors ${detailTab === "info" ? "bg-primary text-white" : "bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300"}`}>
                  <Calendar size={14} /> Info
                </button>
              </div>

              {detailLoading && (
                <div className="py-12 text-center text-gray-500 text-sm">Cargando historial...</div>
              )}

              {!detailLoading && detailError && (
                <div className="py-8 text-center text-red-500 text-sm">{detailError}</div>
              )}

              {!detailLoading && !detailError && detailTab === "chat" && (
                detailMessages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">Sin conversaciones registradas.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {detailMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.sender === "ai" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${message.sender === "ai" ? "bg-white dark:bg-gray-800 rounded-bl-sm" : "bg-green-500/20 rounded-br-sm"}`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {message.sender === "ai" ? "CJ7 IA" : "Cliente"} · {new Date(message.createdAt).toLocaleString("es-BO")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {!detailLoading && !detailError && detailTab === "sales" && (
                detailSales.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">Sin compras registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {detailSales.map((sale) => (
                      <div key={sale.id} className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{sale.notes || "Venta"}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(sale.createdAt).toLocaleDateString("es-BO")} · {sale.paymentMethod || "Sin método"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary">{sale.total} Bs</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sale.status === "Cancelado" ? "bg-red-500/10 text-red-500" : sale.status === "Completado" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-500"}`}>
                            {sale.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {!detailLoading && !detailError && detailTab === "info" && (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                    <span className="text-gray-400 flex items-center gap-2"><User size={14} /> Estado</span>
                    <span className="font-medium">{detailClient.status || "Nuevo"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                    <span className="text-gray-400">Etiquetas</span>
                    <span className="font-medium text-right">{detailClient.tags?.join(", ") || "Sin etiquetas"}</span>
                  </div>
                  {detailClient.notes && (
                    <div className="flex items-start justify-between gap-4 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                      <span className="text-gray-400">Observaciones</span>
                      <span className="font-medium text-right">{detailClient.notes}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                    <span className="text-gray-400">Registro</span>
                    <span className="font-medium">{new Date(detailClient.createdAt).toLocaleDateString("es-BO")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-400">ID</span>
                    <span className="font-mono text-xs text-gray-500 truncate">{detailClient.id}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}