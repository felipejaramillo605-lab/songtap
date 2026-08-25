import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MusicQueue from "@/components/MusicQueue";
import NowPlayingStrip from "@/components/NowPlayingStrip";
import ApplauseVoting from "@/components/ApplauseVoting";
import ClientPqrs from "@/components/ClientPqrs";
import { toast } from "sonner";
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Music2, 
  ClipboardList, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  Clock,
  MessageSquare,
} from "lucide-react";

interface SessionData {
  sessionToken: string;
  sessionId: number;
  venueId: number;
  tableId: number;
  tableName: string;
}

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", icon: <Clock size={12} /> },
  preparing: { label: "Preparando", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30", icon: <Clock size={12} /> },
  delivered: { label: "Entregado", color: "bg-green-500/20 text-green-400 border border-green-500/30", icon: <UtensilsCrossed size={12} /> },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border border-red-500/30", icon: <Trash2 size={12} /> },
};

export default function ClientMenu() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [musicForm, setMusicForm] = useState({ songTitle: "", artist: "" });

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const token = params.get("session");
    const stored = sessionStorage.getItem("songtap_session");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const tokenMatches = !token || parsed.sessionToken === token;
        if (tokenMatches && parsed.sessionToken && parsed.venueId && parsed.tableId) {
          setSession({
            sessionToken: parsed.sessionToken,
            sessionId: parsed.sessionId ?? parsed.id,
            venueId: parsed.venueId,
            tableId: parsed.tableId,
            tableName: parsed.tableName ?? `Mesa ${parsed.tableId}`,
          });
          return;
        }
      } catch {
        sessionStorage.removeItem("songtap_session");
      }
    }

    // El portal solo puede operar con la sesión emitida por el QR; no se crean datos demo en producción.
    navigate("/");
  }, [searchString, navigate]);

  const venueId = session?.venueId ?? 0;

  const { data: menu } = trpc.menu.getPublicMenu.useQuery(
    { venueId, sessionId: session?.sessionId ?? 0, sessionToken: session?.sessionToken ?? "" },
    { enabled: !!session?.venueId && !!session?.sessionId && !!session?.sessionToken }
  );
  const { data: myOrders, refetch: refetchOrders } = trpc.orders.getBySession.useQuery(
    { sessionId: session?.sessionId ?? 1, sessionToken: session?.sessionToken ?? "" },
    { enabled: !!session?.sessionId && !!session?.sessionToken, refetchInterval: 5000 }
  );

  const { data: musicData, refetch: refetchMusic } = trpc.music.getClientQueue.useQuery(
    { venueId, sessionId: session?.sessionId ?? 0, sessionToken: session?.sessionToken ?? "" },
    { enabled: !!venueId && !!session?.sessionId && !!session?.sessionToken, refetchInterval: 5000 }
  );

  useEffect(() => {
    if (menu && menu.length > 0 && activeCategory === 0) {
      setActiveCategory(menu[0].id);
    }
  }, [menu, activeCategory]);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("¡Pedido enviado! El staff lo recibirá pronto.");
      setCart([]);
      setCartOpen(false);
      refetchOrders();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requestMusic = trpc.music.requestSong.useMutation({
    onSuccess: () => {
      toast.success("¡Canción solicitada correctamente!");
      setMusicForm({ songTitle: "", artist: "" });
      refetchMusic();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: applauseScore } = trpc.music.getApplauseScore.useQuery(
    { venueId, sessionId: session?.sessionId ?? 0, sessionToken: session?.sessionToken ?? "", songId: musicData?.current?.id ?? 0 },
    { enabled: !!session?.venueId && !!session?.sessionId && !!session?.sessionToken && !!musicData?.current?.id, refetchInterval: 5000 }
  );

  const addToCart = (item: any) => {
    if (item.isAlcoholic) {
      setPendingAlcoholItem(item);
      setAlcoholWarningOpen(true);
      return;
    }
    executeAddToCart(item);
  };

  const executeAddToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
    toast.success(lang === "es" ? `${item.name} agregado al pedido` : `${item.name} added to order`);
  };

  const updateQty = (menuItemId: number, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.menuItemId === menuItemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (menuItemId: number) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [pendingAlcoholItem, setPendingAlcoholItem] = useState<any | null>(null);
  const [alcoholWarningOpen, setAlcoholWarningOpen] = useState(false);

  const handleOrder = () => {
    if (!session || cart.length === 0) return;
    createOrder.mutate({
      sessionToken: session.sessionToken,
      sessionId: session.sessionId,
      venueId: session.venueId,
      tableId: session.tableId,
      clientName: "Cliente",
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes })),
      ageConfirmed,
    });
  };

  const handleMusicRequest = () => {
    if (!session || !musicForm.songTitle.trim()) return;
    requestMusic.mutate({
      venueId: session.venueId,
      sessionId: session.sessionId,
      sessionToken: session.sessionToken,
      songName: musicForm.songTitle,
      artist: musicForm.artist || "Artista desconocido",
      addedByTableId: session.tableId,
      addedByTableName: session.tableName,
    });
  };

  const currentItems = useMemo(() =>
    menu?.find((c: any) => c.id === activeCategory)?.items ?? [],
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
              <h1 className="font-bold text-foreground text-sm leading-tight">SongTap</h1>
              <p className="text-xs text-muted-foreground">{session.tableName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
              title="Cambiar idioma / Change language"
            >
              {lang === "es" ? "🇺🇸 EN" : "🇨🇴 ES"}
            </button>
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
        <NowPlayingStrip current={musicData?.current} />

        <Tabs defaultValue={["music", "orders", "pqrs"].includes(new URLSearchParams(searchString).get("tab") ?? "") ? new URLSearchParams(searchString).get("tab")! : "menu"}>
          <TabsList className="grid w-full grid-cols-4 bg-secondary border border-border mb-4">
            <TabsTrigger value="menu" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UtensilsCrossed size={14} className="mr-1.5" /> Menú
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList size={14} className="mr-1.5" /> Mis pedidos
              {myOrders?.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled").length ? (
                <span className="ml-1 w-4 h-4 rounded-full bg-yellow-400 text-black text-[10px] font-bold flex items-center justify-center">
                  {myOrders.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled").length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="music" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Music2 size={14} className="mr-1.5" /> Música
            </TabsTrigger>
            <TabsTrigger value="pqrs" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" aria-label="PQRS">
              <MessageSquare size={14} className="mr-1.5" /> PQRS
            </TabsTrigger>
          </TabsList>

          {/* MENU TAB */}
          <TabsContent value="menu" className="space-y-4">
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {menu?.map((cat: any) => (
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
              {currentItems.map((item: any) => (
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
              myOrders.map((order: any) => {
                const cfg = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
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
            <MusicQueue current={musicData?.current} queue={musicData?.queue ?? []} />

            {musicData?.current && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <ApplauseVoting
                    venueId={venueId}
                    sessionId={session.sessionId}
                    sessionToken={session.sessionToken}
                    songId={musicData.current.id}
                    votingTableId={session.tableId}
                    votingTableName={session.tableName}
                    performingTableId={musicData.current.addedByTableId}
                    performingTableName={musicData.current.addedByTableName}
                    averageRating={applauseScore?.averageRating}
                    totalVotes={applauseScore?.totalVotes}
                    onSubmitted={refetchMusic}
                  />
                </CardContent>
              </Card>
            )}

            {/* Solicitar Canción */}
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Pedir una canción</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Agrégala a la cola para que el staff la reproduzca</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Canción *</Label>
                    <Input
                      className="mt-1 bg-input border-border text-foreground text-sm"
                      placeholder="Ej. Despacito"
                      value={musicForm.songTitle}
                      onChange={(e) => setMusicForm({ ...musicForm, songTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Artista (opcional)</Label>
                    <Input
                      className="mt-1 bg-input border-border text-foreground text-sm"
                      placeholder="Ej. Luis Fonsi"
                      value={musicForm.artist}
                      onChange={(e) => setMusicForm({ ...musicForm, artist: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm"
                    onClick={handleMusicRequest}
                    disabled={!musicForm.songTitle.trim() || requestMusic.isPending}
                  >
                    <Send size={14} className="mr-2" />
                    {requestMusic.isPending ? "Enviando..." : "Solicitar canción"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cola Musical */}
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Music2 size={16} className="text-primary" /> Cola Próxima ({musicData?.queue?.length ?? 0})
                </h3>
                {(!musicData?.queue || musicData.queue.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No hay canciones en cola. ¡Sé el primero en pedir una!</p>
                ) : (
                  <div className="space-y-2">
                    {musicData.queue.map((song, idx) => (
                      <div key={song.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-foreground text-sm truncate">{song.songName}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist} • <span className="text-primary">{song.addedByTableName}</span></p>
                        </div>
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-full font-mono flex-shrink-0">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pqrs">
            <ClientPqrs session={session} />
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

      {/* Alcohol Warning Dialog */}
      <Dialog open={alcoholWarningOpen} onOpenChange={setAlcoholWarningOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2 text-yellow-400">
              ⚠️ {lang === "es" ? "Consumo Responsable" : "Responsible Consumption"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              {lang === "es"
                ? `Estás a punto de agregar "${pendingAlcoholItem?.name}" que contiene alcohol.`
                : `You are about to add "${pendingAlcoholItem?.name}" which contains alcohol.`}
            </p>
            <p className="font-semibold text-foreground">
              {lang === "es"
                ? "El consumo de alcohol es exclusivo para mayores de 18 años. Al confirmar, certificas que cumples con la mayoría de edad legal."
                : "Alcohol consumption is restricted to adults over 18. By confirming, you certify that you meet the legal drinking age."}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-border text-muted-foreground hover:text-foreground"
              onClick={() => {
                setAlcoholWarningOpen(false);
                setPendingAlcoholItem(null);
              }}
            >
              {lang === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground font-bold"
              onClick={() => {
                if (pendingAlcoholItem) {
                  executeAddToCart(pendingAlcoholItem);
                }
                setAlcoholWarningOpen(false);
                setPendingAlcoholItem(null);
              }}
            >
              {lang === "es" ? "Soy mayor de 18" : "I am over 18"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total (IVA incluido)</span>
              <span className="text-xl font-bold text-primary">${total.toLocaleString()}</span>
            </div>

            <div className="flex items-start gap-2 pt-1 bg-secondary/20 p-2 rounded-lg border border-border">
              <input
                type="checkbox"
                id="cartAge"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-1 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="cartAge" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Confirmo que soy <span className="font-semibold text-foreground">mayor de 18 años</span> en caso de incluir bebidas alcohólicas en mi pedido.
              </label>
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
