"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, X } from "lucide-react";
import { listProducts } from "@/lib/api/catalog";
import type { Product } from "@/types/catalog";
import { vnd } from "@/lib/format";

interface Props {
  value?: string;
  onChange: (productId: string, product?: Product) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSelect({ value, onChange, placeholder = "Nhập SKU hoặc tên sản phẩm...", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["products-select"],
    queryFn: () => listProducts({ limit: 200, isActive: true }).then((r) => r.data),
    staleTime: 60_000,
  });

  const allProducts = data?.items ?? [];

  const filtered = search.trim()
    ? allProducts.filter((p) => {
        const q = search.toLowerCase();
        return p.sku.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q);
      })
    : allProducts.slice(0, 30);

  const selected = allProducts.find((p) => String(p.id) === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", undefined);
    setSearch("");
  }

  function handleSelect(p: Product) {
    onChange(String(p.id), p);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:opacity-50 hover:bg-accent/30 transition-colors text-left"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-blue-600 shrink-0 bg-blue-50 px-1 rounded">{selected.sku}</span>
            <span className="truncate text-sm">{selected.productName}</span>
            {selected.unit && <span className="text-xs text-muted-foreground shrink-0">/{selected.unit}</span>}
            {selected.minPrice && <span className="text-xs text-orange-600 shrink-0">min {vnd(selected.minPrice)}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        )}
        <span className="flex items-center gap-1 ml-2 shrink-0">
          {selected && (
            <span onClick={handleClear} className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-md border bg-popover shadow-lg">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              className="flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Tìm SKU hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground text-center">
                {search ? `Không tìm thấy "${search}"` : "Không có sản phẩm"}
              </li>
            ) : (
              filtered.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors ${String(p.id) === value ? "bg-accent/50" : ""}`}
                  onClick={() => handleSelect(p)}
                >
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 min-w-[72px]">
                    {highlight(p.sku, search)}
                  </span>
                  <span className="flex-1 truncate">
                    {highlight(p.productName, search)}
                  </span>
                  {p.unit && <span className="text-xs text-muted-foreground shrink-0">{p.unit}</span>}
                  {p.minPrice && <span className="text-xs text-orange-600 shrink-0 font-medium">min {vnd(p.minPrice)}</span>}
                </li>
              ))
            )}
          </ul>

          {!search && allProducts.length > 30 && (
            <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Gõ để tìm kiếm trong {allProducts.length} sản phẩm
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
