"use client";
import Link from 'next/link';
import { motion } from "framer-motion";
import { LayoutDashboard, Users, ShoppingBag, DollarSign, TrendingUp, Bot, Settings, Megaphone, Box, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-soft flex">
      
      {/* Sidebar (Barra Lateral) */}
      <aside className="w-64 p-4 hidden md:block">
        <div className="glass rounded-3xl h-full p-6 flex flex-col justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2 mb-8">
              <Bot size={24} /> CJ7 <span className="text-foreground">IA</span>
            </h1>
            <nav className="flex flex-col gap-2">
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-medium text-sm">
                <LayoutDashboard size={18} /> Dashboard
              </button>
              
              {/* Aquí conectamos el botón al módulo CRM */}
              <Link href="/dashboard/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Users size={18} /> CRM Clientes
              </Link>
              
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <ShoppingBag size={18} /> Ventas
              </button>
              <Link href="/dashboard/inventario" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Box size={18} /> Inventario
              </Link>
              <Link href="/dashboard/campanas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <Megaphone size={18} /> Campañas WhatsApp
              </Link>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
                <BarChart3 size={18} /> Analítica
              </button>
            </nav>
          </div>
          <Link href="/dashboard/perfil" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 text-sm transition-colors">
            <Settings size={18} /> Mi Perfil
          </Link>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">¡Bienvenido de nuevo! 👋</h2>
            <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu negocio hoy.</p>
          </div>
          <button className="bg-primary text-white px-6 py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium text-sm flex items-center gap-2">
            <TrendingUp size={18} /> Crear Campaña IA
          </button>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Ingresos del Mes", value: "$12,450", change: "+12%", icon: <DollarSign size={20} /> },
            { title: "Ventas Hoy", value: "34", change: "+5%", icon: <ShoppingBag size={20} /> },
            { title: "Clientes Nuevos", value: "128", change: "+8%", icon: <Users size={20} /> },
            { title: "Conversión IA", value: "82%", change: "+4%", icon: <Bot size={20} /> },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  {stat.icon}
                </div>
                <span className="text-green-500 text-sm font-medium">{stat.change}</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-gray-500 text-sm">{stat.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Pipeline de Ventas (Kanban) */}
        <div className="glass rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-6">Pipeline de Ventas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { status: "Nuevo", count: 12, color: "bg-blue-500" },
              { status: "En Proceso", count: 8, color: "bg-yellow-500" },
              { status: "Pagado", count: 5, color: "bg-green-500" },
              { status: "Enviado", count: 3, color: "bg-purple-500" },
              { status: "Completado", count: 15, color: "bg-gray-500" },
            ].map((col, i) => (
              <div key={i} className="bg-white/50 dark:bg-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{col.status}</h4>
                  <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{col.count}</span>
                </div>
                {/* Tarjetas de ventas de ejemplo */}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm mb-2 cursor-pointer hover:scale-105 transition-transform">
                  <p className="text-sm font-medium truncate">#1024 - Juan Pérez</p>
                  <p className="text-xs text-gray-500">2 productos</p>
                  <p className="text-sm font-bold text-primary mt-1">$120.00</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <p className="text-sm font-medium truncate">#1025 - Ana López</p>
                  <p className="text-xs text-gray-500">1 producto</p>
                  <p className="text-sm font-bold text-primary mt-1">$45.00</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}