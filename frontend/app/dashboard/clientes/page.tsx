"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Users, Plus, ArrowLeft, Phone, Mail, X, Pencil, Trash2, Search, Smartphone, Upload, Download, FileSpreadsheet } from "lucide-react";

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

    const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8765/clients");
      const data = await res.json();
      // Validación: Si la respuesta es un arreglo, lo guardamos. Si no, mostramos arreglo vacío.
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        setClients([]);
      }
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
        await fetch(`http://localhost:8765/clients/${id}`, { method: "DELETE" });
        fetchClients();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(Boolean);
    const payload = { ...formData, tags: tagsArray };

    try {
      const url = editingClient ? `http://localhost:8765/clients/${editingClient.id}` : "http://localhost:8765/clients";
      const method = editingClient ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || "Ocurrió un error al guardar el cliente.");
        return;
      }

      setIsModalOpen(false);
      fetchClients();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      alert("Error de red al conectar con el servidor.");
    }
  };

    const handleImport = async () => {
    try {
      const res = await fetch("http://localhost:8765/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: importText }),
      });

      if (!res.ok) {
        alert("Error al importar contactos.");
        return;
      }

      const data = await res.json();
      setImportResult(data);
      fetchClients(); // Recarga la tabla con los nuevos
    } catch (error) {
      console.error("Error al importar:", error);
      alert("Error de red al importar.");
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
  const idsQuery = selectedIds.length > 0 ? `?ids=${selectedIds.join(',')}` : '';
  const vcardExportUrl = `http://localhost:8765/clients/export/vcard${idsQuery}`;
  const csvExportUrl = `http://localhost:8765/clients/export/csv${idsQuery}`;

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
          <a 
            href={vcardExportUrl} 
            download
            className="border border-primary text-primary px-6 py-3 rounded-xl hover:bg-primary/10 transition-transform font-medium text-sm flex items-center gap-2"
          >
            <Download size={18} /> {selectedIds.length > 0 ? `Exportar (${selectedIds.length})` : 'Exportar Todos'}
          </a>
          <a 
            href={csvExportUrl} 
            download
            title="Descargar CSV para Excel"
            className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-transform font-medium text-sm flex items-center gap-2"
          >
            <FileSpreadsheet size={18} /> CSV
          </a>
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
              {filteredClients.map((client, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-gray-200/30 dark:border-gray-700/30 hover:bg-primary/5">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(client.id)}
                      onChange={() => toggleSelect(client.id)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="py-4 px-4 font-medium">{client.name}</td>
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
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a 
                        href={`http://localhost:8765/clients/${client.id}/vcard`} 
                        download
                        title="Guardar en mi celular"
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <Smartphone size={16} />
                      </a>
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

    </div>
  );
}