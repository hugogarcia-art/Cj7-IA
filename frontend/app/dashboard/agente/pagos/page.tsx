"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Wallet, QrCode, Plus, X, Trash2, Building2, CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type BankAccount = {
  id: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  cci?: string | null;
  yapePhone?: string | null;
  isDefault: boolean;
};

type PaymentQR = {
  id: string;
  label: string;
  amount?: number | null;
  imageUrl: string;
  accountId?: string | null;
  isDefault: boolean;
};

export default function PagosPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [qrs, setQrs] = useState<PaymentQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal cuentas
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [accForm, setAccForm] = useState({
    fullName: "", bankName: "", accountNumber: "", cci: "", yapePhone: "",
  });

  // Modal QRs
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrForm, setQrForm] = useState({ label: "", amount: "", accountId: "" });
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [accData, qrData] = await Promise.all([
        apiFetch<BankAccount[]>("/bank-accounts"),
        apiFetch<PaymentQR[]>("/payment-qr"),
      ]);
      setAccounts(Array.isArray(accData) ? accData : []);
      setQrs(Array.isArray(qrData) ? qrData : []);
    } catch (err) {
      console.error("Error al cargar pagos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  // ── Cuentas ──
  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch("/bank-accounts", { method: "POST", body: accForm });
      setAccModalOpen(false);
      setAccForm({ fullName: "", bankName: "", accountNumber: "", cci: "", yapePhone: "" });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear cuenta");
    } finally {
      setSaving(false);
    }
  };

  const makeDefaultAccount = async (id: string) => {
    try {
      await apiFetch(`/bank-accounts/${id}`, { method: "PUT", body: { isDefault: true } });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!window.confirm("¿Eliminar esta cuenta bancaria?")) return;
    try {
      await apiFetch(`/bank-accounts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ── QRs ──
  const handleCreateQr = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = new FormData();
      data.append("label", qrForm.label);
      if (qrForm.amount) data.append("amount", qrForm.amount);
      if (qrForm.accountId) data.append("accountId", qrForm.accountId);
      if (qrImage) data.append("image", qrImage);

      await apiFetch("/payment-qr", { method: "POST", body: data });
      setQrModalOpen(false);
      setQrForm({ label: "", amount: "", accountId: "" });
      setQrImage(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear QR");
    } finally {
      setSaving(false);
    }
  };

  const makeDefaultQr = async (id: string) => {
    try {
      await apiFetch(`/payment-qr/${id}`, { method: "PUT", body: { isDefault: true } });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteQr = async (id: string) => {
    if (!window.confirm("¿Eliminar este QR?")) return;
    try {
      await apiFetch(`/payment-qr/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Wallet className="text-primary" /> Pagos del Agente
        </h2>
        <p className="text-gray-500 mt-1">
          Tu agente IA usa estas cuentas y QRs para cobrar. Puedes tener QRs de monto fijo (ej: 379 Bs) o libres.
        </p>
      </div>

      {loading ? (
        <div className="glass rounded-3xl p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ═══ MIS CUENTAS ═══ */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Building2 size={20} className="text-primary" /> Mis Cuentas
              </h3>
              <button onClick={() => setAccModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-xl shadow-glow hover:scale-105 transition-transform text-sm flex items-center gap-2">
                <Plus size={16} /> Agregar
              </button>
            </div>
            <div className="space-y-4">
              {accounts.length === 0 && (
                <div className="glass rounded-3xl p-6 text-center text-gray-500 text-sm">
                  Sin cuentas cargadas. Agrega tu banco con titular y número de cuenta.
                </div>
              )}
              {accounts.map((acc) => (
                <div key={acc.id} className="glass rounded-2xl p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{acc.bankName}</p>
                      <p className="text-sm text-gray-500">Titular: {acc.fullName}</p>
                      <p className="text-sm">Cuenta: <span className="font-mono">{acc.accountNumber}</span></p>
                      {acc.cci && <p className="text-sm">CCI: <span className="font-mono">{acc.cci}</span></p>}
                      {acc.yapePhone && <p className="text-sm">Yape/Plin: <span className="font-mono">{acc.yapePhone}</span></p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {acc.isDefault ? (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Predeterminada
                        </span>
                      ) : (
                        <button onClick={() => makeDefaultAccount(acc.id)} className="text-xs text-primary hover:underline">
                          Hacer predeterminada
                        </button>
                      )}
                      <button onClick={() => deleteAccount(acc.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ MIS QRs ═══ */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <QrCode size={20} className="text-primary" /> Mis QRs de Pago
              </h3>
              <button onClick={() => setQrModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-xl shadow-glow hover:scale-105 transition-transform text-sm flex items-center gap-2">
                <Plus size={16} /> Agregar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {qrs.length === 0 && (
                <div className="glass rounded-3xl p-6 text-center text-gray-500 text-sm sm:col-span-2">
                  Sin QRs cargados. Sube tu QR de Yape/banco (puedes fijarle un monto).
                </div>
              )}
              {qrs.map((qr) => (
                <div key={qr.id} className="glass rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr.imageUrl} alt={qr.label} className="w-full h-40 object-contain bg-white" />
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">{qr.label}</p>
                        <p className="text-xs text-gray-500">
                          {qr.amount ? `Monto fijo: ${qr.amount} Bs` : "QR libre (cualquier monto)"}
                        </p>
                      </div>
                      <button onClick={() => deleteQr(qr.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {qr.isDefault ? (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mt-2 w-fit">
                        <CheckCircle2 size={12} /> Predeterminado
                      </span>
                    ) : (
                      <button onClick={() => makeDefaultQr(qr.id)} className="text-xs text-primary hover:underline mt-2">
                        Hacer predeterminado
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Modal Nueva Cuenta */}
      <AnimatePresence>
        {accModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setAccModalOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Nueva Cuenta</h3>
                <button onClick={() => setAccModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <input type="text" required value={accForm.fullName} onChange={(e) => setAccForm({ ...accForm, fullName: e.target.value })} placeholder="Nombre completo del titular *" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" required value={accForm.bankName} onChange={(e) => setAccForm({ ...accForm, bankName: e.target.value })} placeholder="Nombre del banco * (ej: BANCO UNION)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" required value={accForm.accountNumber} onChange={(e) => setAccForm({ ...accForm, accountNumber: e.target.value })} placeholder="Número de cuenta *" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={accForm.cci} onChange={(e) => setAccForm({ ...accForm, cci: e.target.value })} placeholder="CCI (opcional)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={accForm.yapePhone} onChange={(e) => setAccForm({ ...accForm, yapePhone: e.target.value })} placeholder="Yape/Plin (opcional)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={saving} className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium disabled:opacity-60">
                  {saving ? "Guardando..." : "Guardar Cuenta"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Modal Nuevo QR */}
        {qrModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setQrModalOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Nuevo QR de Pago</h3>
                <button onClick={() => setQrModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateQr} className="space-y-4">
                <input type="text" required value={qrForm.label} onChange={(e) => setQrForm({ ...qrForm, label: e.target.value })} placeholder="Etiqueta * (ej: QR Yape Biokits)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="number" step="0.01" value={qrForm.amount} onChange={(e) => setQrForm({ ...qrForm, amount: e.target.value })} placeholder="Monto fijo en Bs (vacío = QR libre)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <select value={qrForm.accountId} onChange={(e) => setQrForm({ ...qrForm, accountId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sin cuenta vinculada</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>
                  ))}
                </select>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Imagen del QR *</label>
                  <input type="file" required accept="image/jpeg,image/png,image/webp" onChange={(e) => setQrImage(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:cursor-pointer" />
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={saving} className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium disabled:opacity-60">
                  {saving ? "Guardando..." : "Guardar QR"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
