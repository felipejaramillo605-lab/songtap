import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, UtensilsCrossed, Pencil, Trash2, DollarSign, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function ManagerMenu() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", cost: "", categoryId: "", imageUrl: "" });

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: menu, refetch } = trpc.menu.getFullMenu.useQuery({ venueId: venueId! }, { enabled: !!venueId });

  const createCat = trpc.menu.createCategory.useMutation({
    onSuccess: () => { toast.success("Categoría creada"); setCatOpen(false); setCatForm({ name: "", description: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createItem = trpc.menu.createItem.useMutation({
    onSuccess: () => { toast.success("Ítem creado"); setItemOpen(false); setItemForm({ name: "", description: "", price: "", cost: "", categoryId: "", imageUrl: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleItem = trpc.menu.updateItem.useMutation({
    onSuccess: () => { refetch(); },
  });
  const deleteItem = trpc.menu.deleteItem.useMutation({
    onSuccess: () => { toast.success("Ítem eliminado"); refetch(); },
  });

  if (loading) return null;

  const allCategories = menu ?? [];

  return (
    <SongTapLayout role="manager" title="Gestión de Menú">
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Menú Digital</h2>
            <p className="text-sm text-muted-foreground">Gestiona categorías, ítems, precios e imágenes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {showCosts ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">Ver costos</span>
              <Switch checked={showCosts} onCheckedChange={setShowCosts} />
            </div>
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border text-foreground">
                  <Plus size={14} className="mr-1" /> Categoría
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">Nueva categoría</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre *</Label>
                    <Input className="mt-1 bg-input border-border text-foreground" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Bebidas alcohólicas" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <Input className="mt-1 bg-input border-border text-foreground" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground" onClick={() => createCat.mutate({ venueId: venueId!, ...catForm })} disabled={!catForm.name}>
                    Crear categoría
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus size={14} className="mr-1" /> Ítem
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">Nuevo ítem del menú</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Categoría *</Label>
                    <Select value={itemForm.categoryId} onValueChange={(v) => setItemForm({ ...itemForm, categoryId: v })}>
                      <SelectTrigger className="mt-1 bg-input border-border text-foreground"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {allCategories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {[
                    { key: "name", label: "Nombre *", placeholder: "Cerveza artesanal" },
                    { key: "description", label: "Descripción", placeholder: "IPA 500ml" },
                    { key: "price", label: "Precio de venta *", placeholder: "15000" },
                    { key: "cost", label: "Costo (confidencial)", placeholder: "8000" },
                    { key: "imageUrl", label: "URL de imagen", placeholder: "https://..." },
                  ].map((f) => (
                    <div key={f.key}>
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      <Input className="mt-1 bg-input border-border text-foreground" placeholder={f.placeholder} value={(itemForm as Record<string, string>)[f.key]} onChange={(e) => setItemForm({ ...itemForm, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <Button className="w-full bg-primary text-primary-foreground" onClick={() => createItem.mutate({ venueId: venueId!, categoryId: Number(itemForm.categoryId), name: itemForm.name, description: itemForm.description, price: itemForm.price, cost: itemForm.cost || undefined, imageUrl: itemForm.imageUrl || undefined })} disabled={!itemForm.name || !itemForm.price || !itemForm.categoryId}>
                    Crear ítem
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {allCategories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-30" />
            <p>No hay categorías. Crea la primera para comenzar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {allCategories.map((cat) => (
              <Card key={cat.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {cat.name}
                    <span className="text-xs text-muted-foreground font-normal">({cat.items.length} ítems)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cat.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin ítems en esta categoría</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cat.items.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg bg-secondary/30 border border-border flex flex-col gap-2">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                              {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                            </div>
                            <Switch checked={item.isAvailable} onCheckedChange={(v) => toggleItem.mutate({ id: item.id, venueId: venueId!, isAvailable: v })} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-primary">${Number(item.price).toLocaleString()}</p>
                              {showCosts && item.cost && (
                                <p className="text-xs text-muted-foreground">Costo: ${Number(item.cost).toLocaleString()}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0" onClick={() => deleteItem.mutate({ id: item.id, venueId: venueId! })}>
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
