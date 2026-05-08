"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown } from "lucide-react";
import { listProducts } from "@/lib/api/catalog";
import type { Product } from "@/types/catalog";

interface Props {
  value?: string;
  onChange: (productId: string, product?: Product) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSelect({ value, onChange, placeholder = "Chọn sản phẩm (SKU / tên)...", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["products-select"],
    queryFn: () => listProducts({ limit: 200, isActive: true }).then((r) => r.data),
    staleTime: 60_000,
  });

  const filtered = (data?.items ?? []).filter((p) => {
    const q = search.toLowerCase();
    return p.sku.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q);
  });

  const selected = data?.items.find((p) => String(p.id) === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:opacity-50 hover:bg-accent/30 transition-colors"
      >
        {selected ? (
          <span className="truncate">
            <span className="font-mono text-xs text-muted-foreground mr-1.5">{selected.sku}</span>
            {selected.productName}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="flex items-center border-b px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              className="flex h-8 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Tìm SKU hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy</li>
            ) : (
              filtered.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors ${String(p.id) === value ? "bg-accent/50 font-medium" : ""}`}
                  onClick={() => { onChange(String(p.id), p); setOpen(false); setSearch(""); }}
                >
                  <span className="font-mono text-xs text-muted-foreground w-24 shrink-0 truncate">{p.sku}</span>
                  <span className="truncate">{p.productName}</span>
                  {p.unit && <span className="ml-auto text-xs text-muted-foreground shrink-0">{p.unit}</span>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
