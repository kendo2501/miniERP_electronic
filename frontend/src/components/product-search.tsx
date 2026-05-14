"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Package, AlertCircle, Loader2 } from "lucide-react";
import { inventoryApi } from "@/lib/api/inventory";
import type { ProductSearchResult } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (product: ProductSearchResult) => void;
  placeholder?: string;
  warehouseId?: number;
  className?: string;
  disabled?: boolean;
}

export function ProductSearch({ onSelect, placeholder = "Tìm sản phẩm (tên, SKU)...", warehouseId, className, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 1) { setResults([]); setOpen(false); return; }
      setLoading(true);
      try {
        const data = await inventoryApi.searchProducts(q, warehouseId);
        setResults(data);
        setOpen(true);
        setHighlighted(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [warehouseId],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const pick = (product: ProductSearchResult) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(product);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); pick(results[highlighted]); }
    if (e.key === "Escape") { setOpen(false); }
  };

  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          : <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              onMouseDown={() => pick(p)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer select-none",
                i === highlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.productName}</div>
                  <div className="text-xs text-muted-foreground">{p.sku}{p.unit ? ` · ${p.unit}` : ""}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                {p.inStock ? (
                  <span className="text-xs font-medium text-green-600">{p.totalAvailable} {p.unit ?? ""}</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" /> Hết hàng
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length >= 1 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-4 text-sm text-center text-muted-foreground shadow-md">
          Không tìm thấy sản phẩm phù hợp
        </div>
      )}
    </div>
  );
}
