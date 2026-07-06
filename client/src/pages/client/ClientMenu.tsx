import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Music2, ShoppingBag, Plus, Minus, Trash2, Send, ClipboardList,
  UtensilsCrossed, CheckCircle2, Clock, ChefHat, XCircle
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface SessionData {
  sessionToken: string;
  sessionId: number;
  tableId: number;
  venueId: number;
  tableName: string;
}

const statusConfig = {
  pending: { label: "Pendiente", icon: <Clock size={12} />, color: "status-pending" },
  preparing: { label: "En preparación", icon: <ChefHat size={12} />, color: "status-preparing" },
  delivered: { label: "Entregado", icon: <CheckCircle2 size={12} />, color: "status-delivered" },
  cancelled: { label: "Cancelado", icon: <XCircle size={12} />, color: "status-cancelled" },
};

export default function ClientMenu() {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [musicForm, setMusicForm] = useState({ songTitle: "", artist: "" });
  const [musicOpen, setMusicOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("songtap_session");
    if (!stored) { navigate("/"); return; }
    try {
      const s = JSON.parse(stored);
      // Validate session has required fields
      if (!s.sessionToken || !s.venueId) { navigate("/"); return; }
      // sessionId might be missing in older format, derive from token
      setSession({ ...s, sessionId: s.sessionId ?? s.id ?? 1 });
    } catch { navigate("/"); }
  }, [navigate]);

  const venueId = session?.venueId;
  const { data: menu } = trpc.menu.getPublicMenu.useQuery({ venueId: venueId! }, { enabled: !!venueId });
  const { data: myOrders, refetch: refetchOrders } = trpc.orders.getBySession.useQuery(
    { sessionId: session?.sessionId ?? 0 },
    { enabled: !!session?.sessionId, refetchInterval: 8000 }
  );

  useEffect(() => {
    if (menu?.length && activeCategory === null) setActiveCategory(menu[0].id);
  }, [menu, activeCategory]);

  const addToCart = (item: { id: number; name: string; price: string | number }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
    toast.success(`${item.name} agregado al pedido`);
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.menuItemId !== id));
  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((c) => c.menuItemId === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("¡Pedido enviado! El staff lo recibirá pronto.");
      setCart([]);
      setCartOpen(false);
      refetchOrders();
    },
    onError: (e) => toast.error(e.message),
  });

  const requestMusic = trpc.music.request.useMutation({
    onSuccess: () => {
      toast.success("¡Canción solicitada! El staff la pondrá pronto.");
      setMusicForm({ songTitle: "", artist: "" });
      setMusicOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOrder = () => {
    if (!session) return;
    createOrder.mutate({
      sessionToken: session.sessionToken,
      sessionId: session.sessionId,
      venueId: session.venueId,
      tableId: session.tableId,
      clientName: "Cliente",
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes })),
    });
  };

  const handleMusicRequest = () => {
    if (!session || !musicForm.songTitle.trim()) return;
    requestMusic.mutate({
      venueId: session.venueId,
      sessionId: session.sessionId,
      clientName: "Cliente",
      songTitle: musicForm.songTitle,
      artist: musicForm.artist || undefined,
    });
  };

  const currentItems = useMemo(() =>
    menu?.find((c) => c.id === activeCategory)?.items ?? [],
    [menu, activeCategory]
  );

  if (!session) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Music2 size={14} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">SongTap</p>
              <p className="text-[10px] text-primary">{session.tableName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <Tabs defaultValue="menu">
          <TabsList className="w-full bg-secondary border border-border mb-4">
            <TabsTrigger value="menu" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UtensilsCrossed size={14} className="mr-1.5" /> Menú
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList size={14} className="mr-1.5" /> Mis pedidos
              {myOrders?.filter(o => o.status !== "delivered" && o.status !== "cancelled").length ? (
                <span className="ml-1 w-4 h-4 rounded-full bg-yellow-400 text-black text-[10px] font-bold flex items-center justify-center">
                  {myOrders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="music" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Music2 size={14} className="mr-1.5" /> Música
            </TabsTrigger>
          </TabsList>

          {/* MENU TAB */}
          <TabsContent value="menu" className="space-y-4">
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {menu?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div className="grid grid-cols-2 gap-3">
              {currentItems.map((item) => (
                <Card key={item.id} className="bg-card border-border overflow-hidden">
                  {item.imageUrl && (
                    <div className="h-28 overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                    </div>
                  )}
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm leading-tight">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-primary">${Number(item.price).toLocaleString()}</p>
                      <Button
                        size="sm"
                        className="h-7 w-7 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                        onClick={() => addToCart(item)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {currentItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <UtensilsCrossed size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay ítems disponibles en esta categoría</p>
              </div>
            )}
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-3">
            {!myOrders?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aún no has hecho pedidos</p>
              </div>
            ) : (
              myOrders.map((order) => {
                const cfg = statusConfig[order.status as keyof typeof statusConfig];
                return (
                  <Card key={order.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-foreground text-sm">Pedido #{order.id}</p>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</p>
                        <p className="font-bold text-primary">${Number(order.totalAmount).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* MUSIC TAB */}
          <TabsContent value="music" className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Music2 size={22} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">¿Qué quieres escuchar?</h3>
                  <p className="text-xs text-muted-foreground mt-1">Solicita una canción al staff</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Canción *</Label>
                    <Input
                      className="mt-1 bg-input border-border text-foreground"
                      placeholder="Nombre de la canción"
                      value={musicForm.songTitle}
                      onChange={(e) => setMusicForm({ ...musicForm, songTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Artista (opcional)</Label>
                    <Input
                      className="mt-1 bg-input border-border text-foreground"
                      placeholder="Nombre del artista"
                      value={musicForm.artist}
                      onChange={(e) => setMusicForm({ ...musicForm, artist: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    onClick={handleMusicRequest}
                    disabled={!musicForm.songTitle.trim() || requestMusic.isPending}
                  >
                    <Send size={14} className="mr-2" />
                    {requestMusic.isPending ? "Enviando..." : "Solicitar canción"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart button (floating) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-30">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-14 text-base neon-glow shadow-xl"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={18} className="mr-2" />
              Ver pedido ({cartCount} ítems) — ${total.toLocaleString()}
            </Button>
          </div>
        </div>
      )}

      {/* Cart dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary" /> Tu pedido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.menuItemId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-primary">${(item.price * item.quantity).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => updateQty(item.menuItemId, -1)}>
                    <Minus size={12} />
                  </Button>
                  <span className="text-sm font-bold text-foreground w-4 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => updateQty(item.menuItemId, 1)}>
                    <Plus size={12} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => removeFromCart(item.menuItemId)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">${total.toLocaleString()}</span>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold neon-glow"
              onClick={handleOrder}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? "Enviando..." : "Confirmar pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
