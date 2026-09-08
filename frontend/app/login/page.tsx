"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Lock, Mail, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // Antes era email
  const [password, setPassword] = useState("password_seguro_123");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("https://cj7-ia.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      // Guardamos el token en el navegador
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al iniciar sesión");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Volver
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Bot size={32} />
          </div>
          <h1 className="text-3xl font-bold">CJ7 IA</h1>
          <p className="text-gray-500 mt-2">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
        <div>
            <label className="block text-sm text-gray-500 mb-1">Correo o Usuario</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                required 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="marcos123 o tu@correo.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Contraseña</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-primary text-white py-3 rounded-xl shadow-glow hover:scale-105 transition-transform font-medium mt-4"
          >
            Iniciar Sesión
          </button>
        </form>
      </motion.div>
    </div>
  );
}