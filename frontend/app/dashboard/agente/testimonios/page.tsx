"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Plus, X, Trash2, ImageIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Testimonial = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  productId?: string | null;
  createdAt: string;
};

type Product = { id: string; name: string };

export default function TestimoniosPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    productId: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [testimonialsData, productsData] = await Promise.all([
        apiFetch<Testimonial[]>("/testimonials"),
        apiFetch<Product[]>("/products"),
      ]);
      setTestimonials(Array.isArray(testimonialsData) ? testimonialsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error("Error al cargar testimonios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("content", formData.content);
      if (formData.productId) data.append("productId", formData.productId);
      if (imageFile) data.append("image", imageFile);

      await apiFetch("/testimonials", { method: "POST", body: data });
      setIsModalOpen(false);
      setFormData({ title: "", content: "", productId: "" });
      setImageFile(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear testimonio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este testimonio?")) return;
    try {
      await apiFetch(`/testimonials/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Star className="text-primary" /> Testimonios del Agente
          </h2>
          <p className="text-gray-500 mt-1">
            Evidencias que tu agente IA envía como prueba social (antes/después, casos de éxito).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Testimonio
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-3xl p-8 text-center text-gray-500">
          Cargando testimonios...
        </div>
      ) : testimonials.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <ImageIcon size={40} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            Aún no tienes testimonios. Crea el primero (ej: ANTES y DESPUÉS) y tu
            agente los enviará cuando un cliente pida resultados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl overflow-hidden flex flex-col"
            >
              {testimonial.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={testimonial.imageUrl}
                  alt={testimonial.title}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="w-full h-44 bg-primary/10 flex items-center justify-center">
                  <Star size={40} className="text-primary/40" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-lg mb-1">{testimonial.title}</h3>
                <p className="text-sm text-gray-500 flex-1">{testimonial.content}</p>
                {testimonial.productId && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mt-2 w-fit">
                    {products.find((p) => p.id === testimonial.productId)?.name ?? "Producto"}
                  </span>
                )}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => handleDelete(testimonial.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Testimonio */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass rounded-3xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Nuevo Testimonio</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: ANTES — Cliente La Paz"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Texto del testimonio *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: Resultados reales después de 30 días de uso..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Vincular a producto (opcional)
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) =>
                      setFormData({ ...formData, productId: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sin vincular</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Foto del testimonio (opcional pero recomendado)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:cursor-pointer"
                  />
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
                >
                  <Plus size={16} /> {saving ? "Guardando..." : "Guardar Testimonio"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
