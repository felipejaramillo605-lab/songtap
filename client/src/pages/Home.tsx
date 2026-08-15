import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BarChart3, Music2, QrCode, ShoppingBag, Users, Zap } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const features = [
  {
    icon: <QrCode size={24} />,
    title: "Acceso por QR",
    desc: "Los clientes escanean el QR de su mesa y acceden al menú sin registro.",
  },
  {
    icon: <ShoppingBag size={24} />,
    title: "Pedidos en tiempo real",
    desc: "Cola FIFO con estados: pendiente → en preparación → entregado.",
  },
  {
    icon: <Music2 size={24} />,
    title: "Peticiones musicales",
    desc: "Los clientes solicitan canciones directamente desde su mesa.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Dashboard financiero",
    desc: "Ingresos, costos y utilidad en tiempo real por local.",
  },
  {
    icon: <Users size={24} />,
    title: "Multitenant",
    desc: "Owner, Manager y Staff con accesos diferenciados por local.",
  },
  {
    icon: <Zap size={24} />,
    title: "ERP ligero",
    desc: "Gestión de menú, personal, mesas y reportes en un solo lugar.",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "owner") navigate("/owner");
      else if (user.role === "manager") navigate("/manager");
      else if (user.role === "staff") navigate("/staff");
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center neon-glow">
            <Music2 size={18} className="text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground">SongTap</span>
            <span className="text-muted-foreground text-sm ml-1">by CS2</span>
          </div>
        </div>
        <Button
          onClick={() => navigate("/login")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6"
        >
          Iniciar sesión
        </Button>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-green" />
            <span className="text-primary text-sm font-medium">Sistema ERP para bares y karaokes</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight">
            La experiencia de tu local,{" "}
            <span className="text-primary neon-text">elevada al siguiente nivel</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Gestión de pedidos, menú digital, peticiones musicales y finanzas en tiempo real. Todo desde un QR en la mesa.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 py-3 text-base neon-glow"
            >
              Acceder al panel
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-secondary px-8 py-3 text-base"
              onClick={() => navigate("/mesa/demo")}
            >
              Ver demo de cliente
            </Button>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-foreground mb-12">
          Todo lo que necesita tu local
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © 2025 SongTap by CS2 ·{" "}
          <a href="#" className="text-primary hover:underline">
            Política de Privacidad y Tratamiento de Datos
          </a>
        </p>
      </footer>
    </div>
  );
}
