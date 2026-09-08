"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Plus, ArrowLeft, X, Pencil, Trash2, Search, Box, Package, DollarSign, AlertTriangle, ImageIcon } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  price: number;
  offerPrice?: number;
  cost?: number;
  stock: number;
  minStock?: number;
  imageUrl?: string;
  status?: string;
  createdAt: string;
};

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "", description: "", category: "", sku: "",
    price: "", offerPrice: "", cost: "", stock: "", minStock: "", status: "Activo",
  });

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8765/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchProducts(), 0);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (!searchTerm) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Estadísticas del inventario
  const stats = useMemo(() => {
    const total = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const lowStock = products.filter((p) => p.stock <= (p.minStock || 0)).length;
    return { total, totalValue, lowStock };
  }, [products]);

  const openNewModal = () => {
    setEditingProduct(null);
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({ name: "", description: "", category: "", sku: "", price: "", offerPrice: "", cost: "", stock: "", minStock: "", status: "Activo" });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setSelectedFile(null);
    setImagePreview(product.imageUrl || null);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      sku: product.sku || "",
      price: String(product.price),
      offerPrice: product.offerPrice ? String(product.offerPrice) : "",
      cost: product.cost ? String(product.cost) : "",
      stock: String(product.stock),
      minStock: String(product.minStock ?? ""),
      status: product.status || "Activo",
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file)); // Vista previa local
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este producto?")) {
      try {
        await fetch(`http://localhost:8765/products/${id}`, { method: "DELETE" });
        fetchProducts();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Usamos FormData porque enviamos una imagen (multipart/form-data)
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("category", formData.category);
      fd.append("sku", formData.sku);
      fd.append("price", formData.price);
      if (formData.offerPrice) fd.append("offerPrice", formData.offerPrice);
      if (formData.cost) fd.append("cost", formData.cost);
      fd.append("stock", formData.stock || "0");
      if (formData.minStock) fd.append("minStock", formData.minStock);
      fd.append("status", formData.status);
      if (selectedFile) fd.append("file", selectedFile);

      const url = editingProduct
        ? `http://localhost:8765/products/${editingProduct.id}`
        : "http://localhost:8765/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, { method, body: fd });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        alert(errorData?.message || "Ocurrió un error al guardar el producto.");
        return;
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Error de red al conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8 relative">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Box className="text-primary" /> Inventario
          </h2>
          <p className="text-gray-500 mt-1">Tu catálogo. Cada producto aquí, tu IA lo vende en WhatsApp.</p>
        </div>
        <button onClick={openNewModal} className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Package size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Productos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10 text-green-600"><DollarSign size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Valor del inventario</p>
            <p className="text-2xl font-bold">{stats.totalValue.toLocaleString("es-BO")} Bs</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-600"><AlertTriangle size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Stock bajo</p>
            <p className="text-2xl font-bold">{stats.lowStock}</p>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none focus:outline-none w-full text-sm"
        />
      </div>

      {/* Tabla de productos */}
      <div className="glass rounded-3xl p-6 overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Bot size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aún no tienes productos en tu catálogo.</p>
            <p className="text-gray-400 text-sm">Agrega productos y tu IA los venderá en WhatsApp.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Producto</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">SKU</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Precio</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Stock</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500">Estado</th>
                <th className="py-4 px-4 text-sm font-medium text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-gray-200/30 dark:border-gray-700/30 hover:bg-primary/5">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <div className="relative w-12 h-12 overflow-hidden rounded-xl">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={48}
                            height={48}
                            unoptimized
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.category && <p className="text-xs text-gray-400">{product.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-500 text-sm font-mono">{product.sku}</td>
                  <td className="py-4 px-4">
                    {product.offerPrice ? (
                      <div>
                        <span className="text-gray-400 line-through text-xs mr-1">{product.price}</span>
                        <span className="font-bold text-primary">{product.offerPrice} Bs</span>
                      </div>
                    ) : (
                      <span className="font-bold">{product.price} Bs</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.stock === 0 ? "bg-red-500/10 text-red-500"
                      : product.stock <= (product.minStock || 0) ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-green-500/10 text-green-600"
                    }`}>
                      {product.stock} unidades
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{product.status}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(product)} className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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

      {/* Modal de Producto */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Imagen */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Imagen del producto</label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <Image src={imagePreview} alt="Vista previa" fill sizes="80px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ImageIcon size={28} />
                      </div>
                    )}
                    <label className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5">
                      <ImageIcon size={14} /> Subir imagen
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Nombre del producto *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej. Zapatillas Nike Air Max" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Precio (Bs) *</label>
                    <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="450" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Precio oferta</label>
                    <input type="number" step="0.01" value={formData.offerPrice} onChange={(e) => setFormData({...formData, offerPrice: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="399" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Stock *</label>
                    <input type="number" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Stock mínimo</label>
                    <input type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">SKU *</label>
                  <input type="text" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="NIKE-001" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Categoría</label>
                    <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Calzado" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Costo</label>
                    <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="300" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Descripción</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Descripción que usará tu IA al vender..." />
                </div>

                <button type="submit" disabled={saving} className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium mt-4 disabled:opacity-50 disabled:hover:scale-100">
                  {saving ? "Guardando..." : editingProduct ? "Guardar Cambios" : "Guardar Producto"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
