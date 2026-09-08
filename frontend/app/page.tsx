"use client";
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { Bot, ShoppingBag, Megaphone, BarChart3 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-soft p-8">
      {/* Navbar */}
      <nav className="glass rounded-2xl p-4 flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Bot size={28} /> CJ7 <span className="text-foreground">IA</span>
        </h1>
        {/* Aquí colocamos los dos botones */}
        <div className="flex gap-2">
          <button onClick={() => router.push('/login')} className="bg-primary text-white px-6 py-2 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium">
            Iniciar Sesión
          </button>
          <button onClick={() => router.push('/register')} className="border border-primary text-primary px-6 py-2 rounded-xl hover:bg-primary/10 transition-transform font-medium">
            Registrarse
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center my-20">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
        >
          Automatiza tu negocio <br/> <span className="text-primary">con Inteligencia Artificial</span>
        </motion.h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
          Reduce de 5 horas a 5 minutos tus procesos de ventas, atención al cliente y publicidad.
        </p>
      </section>

      {/* Grid de Módulos (Glassmorphism) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {[
          { icon: <Bot size={24} />, title: "Agente IA WhatsApp", desc: "Vende y atiende 24/7" },
          { icon: <ShoppingBag size={24} />, title: "CRM & Ventas", desc: "Pipeline visual y control total" },
          { icon: <Megaphone size={24} />, title: "Meta Ads IA", desc: "Crea campañas en 1 clic" },
          { icon: <BarChart3 size={24} />, title: "Analítica", desc: "Métricas en tiempo real" },
        ].map((mod, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-3xl p-6 hover:shadow-glow transition-all cursor-pointer"
          >
            <div className="text-primary mb-4 w-12 h-12 flex items-center justify-center bg-primary/10 rounded-xl">
              {mod.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{mod.title}</h3>
            <p className="text-gray-500">{mod.desc}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
