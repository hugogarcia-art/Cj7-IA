"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, CheckCircle2, Store, Sparkles, X, User, Shirt, HeartPulse,
  Smartphone, Watch, Car, Home, Signal, Wrench, Briefcase,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";

type AgentConfig = {
  category: string;
  agentName: string;
  personality?: string | null;
  businessName?: string | null;
  isActive: boolean;
} | null;

type StoreInfo = {
  city?: string | null;
  address?: string | null;
  schedule?: string | null;
  deliveryLocal?: boolean;
} | null;

type WspCredentials = {
  phoneNumberId?: string;
  verified?: boolean;
  tokenPreview?: string;
  displayPhone?: string | null;
} | null;

const PRODUCT_CATEGORIES = [
  { id: "salud", label: "Salud y Bienestar", icon: HeartPulse, desc: "Suplementos, farmacia, cuidado personal", personality: "Vendedor experto en salud y bienestar: empático, educado en beneficios, cuida las indicaciones." },
  { id: "ropa", label: "Ropa y Moda", icon: Shirt, desc: "Moda, tallas, colores, temporada", personality: "Vendedor de moda: conoce tallas, colores y tendencias, sugiere combinaciones." },
  { id: "accesorios", label: "Artículos y Accesorios", icon: Watch, desc: "Relojes, joyas, gadgets, complementos", personality: "Vendedor de accesorios: experto en calidad, materiales y estilo." },
  { id: "vehiculos", label: "Vehículos", icon: Car, desc: "Autos, motos, repuestos", personality: "Vendedor de vehículos: experto en modelos, mecánica, financiamiento y test drive." },
];

const SERVICE_CATEGORIES = [
  { id: "consultoria", label: "Consultoría", icon: Briefcase, desc: "Negocios, estrategia, gestión", personality: "Consultor comercial: experto en cierre B2B, propuestas de valor y contratos." },
  { id: "bienes", label: "Bienes y Raíces", icon: Home, desc: "Casas, terrenos, alquileres", personality: "Asesor inmobiliario: experto en propiedades, visitas y cierres de compraventa." },
  { id: "telecom", label: "Telecomunicaciones", icon: Signal, desc: "Internet, planes, equipos", personality: "Vendedor de telecomunicaciones: experto en planes, cobertura y retención." },
  { id: "servicios", label: "Servicios Profesionales", icon: Wrench, desc: "Oficios, mantenimiento, eventos", personality: "Vendedor de servicios: experto en presupuestos, disponibilidad y garantía." },
];

const CATEGORIES = [
  { id: "personal", label: "Asistente Personal", icon: User, desc: "Agenda, recordatorios y atención general", personality: "Asistente personal: cercano, organizado, ayuda con recordatorios y trámites." },
  ...PRODUCT_CATEGORIES,
  ...SERVICE_CATEGORIES,
  { id: "custom", label: "Crear Mi Agente IA", icon: Sparkles, desc: "Personaliza todo: tu negocio, tu estilo", personality: "" },
];

export default function AgentePage() {
  const [config, setConfig] = useState<AgentConfig>(null);
  const [store, setStore] = useState<StoreInfo>(null);
  const [wspCred, setWspCred] = useState<WspCredentials>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [promptChoice, setPromptChoice] = useState<"oficial" | "custom">("oficial");

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState("");
  const [form, setForm] = useState({
    agentName: "Alex", businessName: "", personality: "",
  });

  // Store form
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({
    city: "", address: "", schedule: "", deliveryLocal: false,
  });
  // 💳 SUSCRIPCIÓN / PAYWALL
  const [paywall, setPaywall] = useState<string | null>(null);
  const [sub, setSub] = useState<{
    plan: string; isTrial: boolean; trialExpired: boolean; daysLeft: number; priceUsd: number;
  } | null>(null);
  // 📱 PASO 0 — WhatsApp
  const [wspOpen, setWspOpen] = useState(false);
  const [wspForm, setWspForm] = useState({
    phoneNumberId: "", wabaId: "", accessToken: "", displayPhone: "",
  });
  const [wspMsg, setWspMsg] = useState("");
  const [setupInfo, setSetupInfo] = useState<{
    callbackUrl: string; verifyToken: string; isPersonal: boolean;
  } | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cfg, st, cred] = await Promise.all([
        apiFetch<AgentConfig>("/agent-config"),
        apiFetch<StoreInfo>("/store-info"),
        apiFetch<WspCredentials>("/whatsapp-credentials"),
      ]);
      setConfig(cfg ?? null);
      setStore(st ?? null);
      setWspCred(cred ?? null);
      const si = await apiFetch<{
        callbackUrl: string; verifyToken: string; isPersonal: boolean;
      }>("/whatsapp-credentials/setup-info");
      setSetupInfo(si ?? null);
      const subscription = await apiFetch<{
        plan: string; isTrial: boolean; trialExpired: boolean; daysLeft: number; priceUsd: number;
      }>("/agent-config/subscription");
      setSub(subscription ?? null);
      if (st) setStoreForm({
        city: st.city ?? "", address: st.address ?? "",
        schedule: st.schedule ?? "", deliveryLocal: st.deliveryLocal ?? false,
      });
    } catch (err) {
      // 💳 Si el trial expiró, el backend devuelve 403 → mostramos el paywall
      if (err instanceof ApiError && err.status === 403) {
        setPaywall(err.message);
      }
      console.error("Error cargando módulo agente:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleCreateAgent = async () => {
    setError("");
    if (!selectedCat) { setError("Elige una categoría."); return; }
    setSaving(true);
    try {
      // 🎭 Personality viene de la categoría elegida (las 10 definidas arriba)
      const catPersonality: Record<string, string> = Object.fromEntries(
        CATEGORIES.map((c) => [c.id, c.personality]),
      );
      if (selectedCat === "custom") {
        catPersonality.custom = form.personality || "Vendedor profesional y carismático.";
      }
      await apiFetch("/agent-config", {
        method: "PUT",
        body: {
          category: selectedCat,
          agentName: form.agentName,
          businessName: form.businessName,
          personality: catPersonality[selectedCat],
          isActive: true,
        },
      });

      // 🔓 BYOK: guarda SU key OpenAI cifrada (si la puso)
      if (openaiKey.trim()) {
        await apiFetch("/agent-config/openai-key", {
          method: "POST",
          body: { apiKey: openaiKey.trim() },
        });
      }

      // 🎭 Guarda el modo de prompt (oficial o su custom)
      await apiFetch("/agent-config/prompt-mode", {
        method: "PUT",
        body: {
          promptMode: promptChoice,
          ...(promptChoice === "custom" && form.personality.trim()
            ? { customPrompt: form.personality.trim() }
            : {}),
        },
      });

      setWizardOpen(false);
      setPromptChoice("oficial");
      setOpenaiKey("");
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el agente");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch("/store-info", { method: "PUT", body: storeForm });
      setStoreOpen(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar tienda");
    } finally {
      setSaving(false);
    }
  };

  // 📱 PASO 0 — Guarda credenciales y verifica contra Meta
  const handleSaveWsp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setWspMsg("");
    try {
      await apiFetch("/whatsapp-credentials", { method: "PUT", body: wspForm });
      const v = await apiFetch<{ ok: boolean; detail: string }>(
        "/whatsapp-credentials/verify",
        { method: "POST" },
      );
      setWspMsg(v.detail);
      fetchData();
    } catch (err: unknown) {
      setWspMsg(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const stepDone = {
    whatsapp: !!wspCred?.verified,
    agent: !!config,
    store: !!store,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="glass rounded-3xl p-8 text-gray-500">Cargando Módulo Agente...</div>
      </div>
    );
  }
  // 🚪 GATE: sin WhatsApp verificado, SOLO se muestra la conexión
  if (!wspCred?.verified) {
        // ETAPA 1: los pasos importantes
    if (!showSteps) {
      return (
        <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 w-full max-w-lg">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                <Smartphone size={32} />
              </div>
              <h1 className="text-3xl font-bold">Pasos Muy Importantes</h1>
              <p className="text-gray-500 mt-2">
                Sigue estos 5 pasos en Meta para que tu número se convierta en agente automático.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { n: 1, t: "Crea tu app en Meta", d: "developers.facebook.com → Mi Apps → Crear app → tipo Business → agrega el producto WhatsApp." },
                { n: 2, t: "Copia tus credenciales", d: "WhatsApp → API Setup: copia tu Phone Number ID y tu Access Token (los usarás en el siguiente paso)." },
                { n: 3, t: "Configura el Webhook", d: "WhatsApp → Configuration → Edit: pega el Callback URL y el Verify Token que te damos abajo. 👇" },
                { n: 4, t: "Suscríbete a 'messages'", d: "En la misma sección de Webhook: Subscribe → marca el campo 'messages'." },
                { n: 5, t: "Conecta en CJ7", d: "Vuelve aquí y pulsa el botón de abajo para conectar tu número." },
              ].map((paso) => (
                <div key={paso.n} className="flex gap-3 p-3 rounded-2xl bg-white/40 dark:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {paso.n}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{paso.t}</p>
                    <p className="text-xs text-gray-500">{paso.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Datos copiables de CJ7 */}
            <div className="space-y-3 mb-6">
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-bold text-gray-600 mb-1">📋 CALLBACK URL (cópiala en Meta):</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-white/70 dark:bg-black/30 p-2 rounded-lg break-all">{setupInfo?.callbackUrl ?? "cargando..."}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(setupInfo?.callbackUrl ?? "")}
                    className="text-xs bg-primary text-white px-3 rounded-lg">Copiar</button>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-bold text-gray-600 mb-1">🔑 VERIFY TOKEN (cópialo en Meta):</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-white/70 dark:bg-black/30 p-2 rounded-lg break-all">{setupInfo?.verifyToken ?? "cargando..."}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(setupInfo?.verifyToken ?? "")}
                    className="text-xs bg-primary text-white px-3 rounded-lg">Copiar</button>
                </div>
              </div>
            </div>

            <button onClick={() => setShowSteps(true)}
              className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium">
              ✅ Ya hice los pasos → Conectar Mi WhatsApp
            </button>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
              <Smartphone size={32} />
            </div>
            <h1 className="text-3xl font-bold">Conecta tu WhatsApp</h1>
            <p className="text-gray-500 mt-2">
              Convierte tu número en un agente de ventas automático 24/7: responde,
              muestra tu catálogo y cobra por ti.
            </p>
          </div>

          <form onSubmit={handleSaveWsp} className="space-y-4">
            <input type="text" required value={wspForm.phoneNumberId}
              onChange={(e) => setWspForm({ ...wspForm, phoneNumberId: e.target.value })}
              placeholder="Phone Number ID *"
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="text" value={wspForm.wabaId}
              onChange={(e) => setWspForm({ ...wspForm, wabaId: e.target.value })}
              placeholder="WhatsApp Business Account ID (opcional)"
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="password" required value={wspForm.accessToken}
              onChange={(e) => setWspForm({ ...wspForm, accessToken: e.target.value })}
              placeholder="Access Token *"
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="text" value={wspForm.displayPhone}
              onChange={(e) => setWspForm({ ...wspForm, displayPhone: e.target.value })}
              placeholder="Tu número (ej: +591 67573862)"
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
            {wspMsg && (
              <p className={`text-sm text-center ${wspMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                {wspMsg}
              </p>
            )}
            <button type="submit" disabled={saving}
              className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium disabled:opacity-60">
              {saving ? "Verificando con Meta..." : "📱 Conectar Mi WhatsApp"}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-4 text-center">
            📍 Meta Business → WhatsApp → API Setup: ahí copias tu Phone Number ID y Access Token.
          </p>
        </motion.div>
      </div>
    );
  }
    // 💳 PAYWALL: trial expirado → pantalla de pago
  if (paywall) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-10 w-full max-w-md text-center"
        >
          <p className="text-5xl mb-4">⏳</p>
          <h1 className="text-2xl font-bold mb-2">Prueba gratuita expirada</h1>
          <p className="text-gray-500 mb-6">{paywall}</p>
          <div className="glass rounded-2xl p-6 mb-6">
            <p className="text-sm text-gray-500">Plan PRO</p>
            <p className="text-4xl font-bold text-primary mb-1">
              $49<span className="text-lg text-gray-400">/mes</span>
            </p>
            <ul className="text-sm text-gray-600 text-left mt-3 space-y-1">
              <li>✅ Agente de ventas 24/7 con IA</li>
              <li>✅ CRM, campañas y analítica</li>
              <li>✅ Verificación de comprobantes con IA</li>
              <li>✅ Soporte prioritario</li>
            </ul>
          </div>
          <button
            onClick={() => alert("Pasarela de pago en preparación — contáctanos para activar tu plan PRO.")}
            className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium"
          >
            💳 Suscribirme por $49/mes
          </button>
          <Link href="/dashboard" className="block text-sm text-gray-500 mt-4 hover:text-primary">
            Volver al Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
        ← Volver al Dashboard
      </Link>

      {/* HEADER */}
      <div className="glass rounded-3xl p-6 mb-8 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="text-primary" /> Módulo Agente de IA
          </h2>
          <p className="text-gray-500 mt-1">
            {config
              ? `Tu agente "${config.agentName}" está ${config.isActive ? "ACTIVO y vendiendo 🟢" : "creado pero INACTIVO ⏸️"}`
              : "Aún no tienes agente. Créalo en 2 minutos. 👇"}
          </p>
        </div>
        {config && (
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${config.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
            {config.isActive ? "🟢 Activo" : "⏸️ Inactivo"}
          </div>
        )}
        {sub?.isTrial && !paywall && (
          <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium">
            ⏳ Prueba gratis: {sub.daysLeft} días restantes
          </span>
        )}
      </div>

      {/* 📱 PASO 0 — CONEXIÓN WHATSAPP */}
      <SectionCard
        step="0"
        title="Conecta tu WhatsApp con CJ7"
        desc="Tu agente responderá desde TU número con TU catálogo y TUS cuentas."
        done={stepDone.whatsapp}
        actionLabel={wspCred?.verified ? "Revisar conexión" : "Conectar WhatsApp"}
        onAction={() => setWspOpen(true)}
      >
        {wspCred?.verified ? (
          <p className="text-sm text-green-600">
            ✅ Conectado — Phone Number ID: {wspCred.phoneNumberId}
            {wspCred.displayPhone ? ` (${wspCred.displayPhone})` : ""}
          </p>
        ) : wspCred ? (
          <p className="text-sm text-yellow-600">
            ⚠️ Credenciales guardadas pero SIN verificar. Pulsa verificar.
          </p>
        ) : null}
      </SectionCard>

      {/* 1️⃣ CREAR AGENTE */}
      <SectionCard
        step="1"
        title="Crear Mi Agente de Ventas"
        desc="Elige una categoría y personaliza a tu vendedor IA."
        done={stepDone.agent}
        actionLabel={config ? "Editar agente" : "Crear mi agente"}
        onAction={() => {
          if (config) {
            setSelectedCat(config.category);
            setForm({
              agentName: config.agentName,
              businessName: config.businessName ?? "",
              personality: config.personality ?? "",
            });
          }
          setWizardOpen(true);
        }}
      >
        {config && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><b>Agente:</b> {config.agentName} · <b>Categoría:</b> {CATEGORIES.find(c => c.id === config.category)?.label}</p>
            {config.businessName && <p><b>Negocio:</b> {config.businessName}</p>}
          </div>
        )}
      </SectionCard>

      {/* 2️⃣ INVENTARIO */}
      <SectionCard
        step="2"
        title="Crear Mi Inventario"
        desc="Tu agente aprende de este catálogo para vender con precios reales."
        done={false}
        actionLabel="Ir al Inventario"
        href="/dashboard/inventario"
      />

      {/* 3️⃣ PAGOS */}
      <SectionCard
        step="3"
        title="Cargar Mi QR o Cuenta Bancaria"
        desc="El agente envía el QR cuyo monto coincida con el producto y comparte tus cuentas."
        done={false}
        actionLabel="Ir a Pagos"
        href="/dashboard/agente/pagos"
      />

      {/* 4️⃣ TESTIMONIOS */}
      <SectionCard
        step="4"
        title="Cargar Mis Testimonios"
        desc="Prueba social: fotos antes/después y casos de éxito que tu agente envía."
        done={false}
        actionLabel="Ir a Testimonios"
        href="/dashboard/agente/testimonios"
      />

      {/* 5️⃣ MI TIENDA */}
      <SectionCard
        step="5"
        title="Mi Tienda / Oficina"
        desc="Ciudad, dirección y horarios. El agente coordina entregas con esta info."
        done={stepDone.store}
        actionLabel={store ? "Editar mi tienda" : "Configurar mi tienda"}
        onAction={() => setStoreOpen(true)}
      >
        {store && (
          <div className="text-sm text-gray-600 space-y-1">
            {store.city && <p>📍 <b>Ciudad:</b> {store.city}</p>}
            {store.address && <p>🏠 <b>Dirección:</b> {store.address}</p>}
            {store.schedule && <p>🕒 <b>Horario:</b> {store.schedule}</p>}
            {store.deliveryLocal && <p>🚚 Contraentrega disponible en tu ciudad</p>}
          </div>
        )}
      </SectionCard>

      <AnimatePresence>
        {/* ═══ MODAL WHATSAPP (PASO 0) ═══ */}
        {wspOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setWspOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Smartphone className="text-primary" /> Conectar WhatsApp
                </h3>
                <button onClick={() => setWspOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                📍 Meta Business → WhatsApp → API Setup: copia tu <b>Phone Number ID</b> y tu <b>Access Token</b>.
              </p>
              <form onSubmit={handleSaveWsp} className="space-y-4">
                <input type="text" required value={wspForm.phoneNumberId}
                  onChange={(e) => setWspForm({ ...wspForm, phoneNumberId: e.target.value })}
                  placeholder="Phone Number ID *"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={wspForm.wabaId}
                  onChange={(e) => setWspForm({ ...wspForm, wabaId: e.target.value })}
                  placeholder="WhatsApp Business Account ID (opcional)"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="password" required value={wspForm.accessToken}
                  onChange={(e) => setWspForm({ ...wspForm, accessToken: e.target.value })}
                  placeholder="Access Token * (se guarda cifrado en el servidor)"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={wspForm.displayPhone}
                  onChange={(e) => setWspForm({ ...wspForm, displayPhone: e.target.value })}
                  placeholder="Tu número (ej: +591 70012345)"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                {wspMsg && (
                  <p className={`text-sm text-center ${wspMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                    {wspMsg}
                  </p>
                )}
                <button type="submit" disabled={saving}
                  className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium disabled:opacity-60">
                  {saving ? "Verificando con Meta..." : "Guardar y Verificar"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ WIZARD CREAR AGENTE ═══ */}
        {wizardOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setWizardOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Crear Mi Agente</h3>
                <button onClick={() => setWizardOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-2">1. ¿Qué tipo de agente necesitas?</p>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">📦 Productos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {CATEGORIES.filter(c => PRODUCT_CATEGORIES.some(p => p.id === c.id) || c.id === "personal").map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setSelectedCat(cat.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${selectedCat === cat.id ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}>
                    <cat.icon size={22} className="text-primary mb-2" />
                    <p className="font-bold text-sm">{cat.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">🛠️ Servicios</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {CATEGORIES.filter(c => SERVICE_CATEGORIES.some(p => p.id === c.id)).map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setSelectedCat(cat.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${selectedCat === cat.id ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}>
                    <cat.icon size={22} className="text-primary mb-2" />
                    <p className="font-bold text-sm">{cat.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSelectedCat("custom")}
                className={`w-full p-4 rounded-2xl border text-left transition-all mb-6 ${selectedCat === "custom" ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}>
                <Sparkles size={22} className="text-primary mb-2" />
                <p className="font-bold text-sm">✨ Crear Mi Agente IA (personalizado)</p>
                <p className="text-xs text-gray-500 mt-1">Personaliza todo: tu negocio, tu estilo</p>
              </button>

              <p className="text-sm text-gray-500 mb-3">2. Identidad de tu agente</p>
              <div className="space-y-4 mb-6">
                <input type="text" value={form.agentName}
                  onChange={(e) => setForm({ ...form, agentName: e.target.value })}
                  placeholder="Nombre del agente * (ej: Alex)"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Nombre de tu negocio (ej: Bioliffe)"
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                {selectedCat === "custom" && (
                  <textarea rows={3} value={form.personality}
                    onChange={(e) => setForm({ ...form, personality: e.target.value })}
                    placeholder="Describe la personalidad y tono de tu agente..."
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              </div>
              {/* 🔓 PASO 3: Tokens según el plan */}
              {sub?.plan === "PRO" ? (
                <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
                  <p className="font-bold text-sm text-green-700 dark:text-green-400">✅ Tokens de OpenAI INCLUIDOS en tu plan PRO</p>
                  <p className="text-xs text-gray-500 mt-1">Tu agente usa nuestra infraestructura — no configuras nada.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-2">3. Tu API Key de OpenAI (prueba gratis con TUS tokens)</p>
                  <input type="password" value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-... (tu token de platform.openai.com)"
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <p className="text-xs text-gray-400">Cifrada AES-256 — al pasar a PRO, nuestros tokens van incluidos.</p>
                </>
              )}

              {/* 🎭 PASO 4: El prompt del agente */}
              <p className="text-sm text-gray-500 mt-4 mb-2">4. El prompt del agente</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPromptChoice("oficial")}
                  className={`p-4 rounded-2xl border text-left transition-all ${promptChoice === "oficial" ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}>
                  <p className="font-bold text-sm">⭐ Oficial CJ7 IA</p>
                  <p className="text-xs text-gray-500 mt-1">Recomendado — closer entrenado por nosotros (estilo Alex Dey)</p>
                </button>
                <button type="button" onClick={() => setPromptChoice("custom")}
                  className={`p-4 rounded-2xl border text-left transition-all ${promptChoice === "custom" ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}>
                  <p className="font-bold text-sm">✏️ Personalizado</p>
                  <p className="text-xs text-gray-500 mt-1">Escribe tu propio prompt (las reglas del sistema se mantienen)</p>
                </button>
              </div>
              {promptChoice === "custom" && (
                <textarea rows={4} value={form.personality}
                  onChange={(e) => setForm({ ...form, personality: e.target.value })}
                  placeholder="Tu prompt personalizado: cómo debe hablar tu agente, qué técnicas usar, su tono..."
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
              )}

              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

              <button onClick={handleCreateAgent} disabled={saving}
                className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                <Sparkles size={18} /> {saving ? "Creando..." : "✨ Crear Mi Agente"}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ MODAL TIENDA ═══ */}
        {storeOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setStoreOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2"><Store size={22} className="text-primary" /> Mi Tienda</h3>
                <button onClick={() => setStoreOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveStore} className="space-y-4">
                <input type="text" value={storeForm.city} onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                  placeholder="Ciudad (ej: La Paz)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Dirección de la tienda/oficina" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={storeForm.schedule} onChange={(e) => setStoreForm({ ...storeForm, schedule: e.target.value })}
                  placeholder="Horarios de atención (ej: Lun-Sáb 9:00-19:00)" className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary" />
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={storeForm.deliveryLocal}
                    onChange={(e) => setStoreForm({ ...storeForm, deliveryLocal: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB]" />
                  Ofrezco contraentrega en mi ciudad
                </label>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={saving}
                  className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium disabled:opacity-60">
                  {saving ? "Guardando..." : "Guardar Tienda"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Componente interno: tarjeta de sección con estado ─── */
function SectionCard({
  step, title, desc, done, actionLabel, onAction, href, children,
}: {
  step: string; title: string; desc: string; done: boolean;
  actionLabel: string; onAction?: () => void; href?: string; children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-3xl p-6 mb-5"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 flex-1 min-w-[240px]">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"}`}>
            {done ? <CheckCircle2 size={22} /> : <span className="font-bold">{step}</span>}
          </div>
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
            {children}
          </div>
        </div>
        {href ? (
          <Link href={href} className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-glow hover:scale-105 transition-transform text-sm font-medium whitespace-nowrap">
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction} className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-glow hover:scale-105 transition-transform text-sm font-medium whitespace-nowrap">
            {actionLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}
