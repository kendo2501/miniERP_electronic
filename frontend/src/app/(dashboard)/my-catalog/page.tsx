"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingBag, Plus, Minus, Trash2, Loader2, Search, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { listProducts } from "@/lib/api/catalog";
import { listCategories, listBrands } from "@/lib/api/catalog";
import { createQuotation } from "@/lib/api/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

interface CartItem {
  productId: number;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
}

export default function MyCatalogPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [page] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const params: Record<string, unknown> = { page, limit: 24, status: "ACTIVE" };
  if (search) params.search = search;
  if (categoryFilter !== "ALL") params.categoryId = categoryFilter;
  if (brandFilter !== "ALL") params.brandId = brandFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["catalog-browse", params],
    queryFn: () => listProducts(params),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => listBrands(),
  });

  const submitMut = useMutation({
    mutationFn: () => {
      const customerId = (user as any)?.linkedCustomerId;
      return createQuotation({
        customerId,
        notes: notes || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setCart([]);
      setNotes("");
      toast.success(t.myCatalog.submitted);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const products = (data as any)?.items ?? [];
  const totalProducts = (data as any)?.total ?? 0;

  function addToCart(p: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, sku: p.sku, productName: p.productName, unit: p.unit ?? "pcs", quantity: 1 }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(0.001, i.quantity + delta) } : i)
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const totalInCart = cart.reduce((s, i) => s + i.quantity, 0);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">{t.myCatalog.submitted}</h2>
        <p className="text-muted-foreground max-w-sm">
          Chúng tôi sẽ xem xét và gửi báo giá cho bạn sớm nhất có thể.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/my-quotations">{t.myCatalog.viewQuotations}</Link>
          </Button>
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            {t.myCatalog.requestQuote}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            {t.myCatalog.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.myCatalog.subtitle}</p>
        </div>
        {cart.length > 0 && (
          <Button onClick={() => setCartOpen(true)} className="relative">
            <ShoppingBag className="h-4 w-4 mr-2" />
            {t.myCatalog.requestQuote}
            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-white text-primary text-xs font-bold">
              {cart.length}
            </span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t.myCatalog.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t.myCatalog.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t.myCatalog.allCategories}</SelectItem>
            {((categories as any) ?? []).map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.myCatalog.allBrands} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t.myCatalog.allBrands}</SelectItem>
            {((brands as any) ?? []).map((b: any) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {totalProducts} {t.myCatalog.noProducts.toLowerCase().includes("no") ? "products" : "sản phẩm"}
        </span>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t.myCatalog.noProducts}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p: any) => {
            const inCart = cart.find((i) => i.productId === p.id);
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                    <p className="font-semibold text-sm leading-snug mt-0.5">{p.productName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.category && (
                      <Badge variant="secondary" className="text-xs">
                        {p.category.name}
                      </Badge>
                    )}
                    {p.brand && (
                      <Badge variant="outline" className="text-xs">
                        {p.brand.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {p.unit ?? "pcs"}
                    </span>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQty(p.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQty(p.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => removeFromCart(p.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addToCart(p)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t.myCatalog.addToQuote}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {t.myCatalog.quoteCart}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">{t.myCatalog.cartEmpty}</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => updateQty(item.productId, -1)}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => updateQty(item.productId, 1)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 shrink-0"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>{t.myCatalog.notes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.myCatalog.notesPlaceholder}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartOpen(false)}>{t.common.cancel}</Button>
            <Button
              disabled={cart.length === 0 || submitMut.isPending}
              onClick={() => submitMut.mutate()}
            >
              {submitMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t.myCatalog.submitting}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t.myCatalog.submitQuote}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
