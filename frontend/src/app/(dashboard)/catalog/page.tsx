"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CatalogPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/catalog/products"); }, [router]);
  return null;
}
