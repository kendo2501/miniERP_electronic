"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const auth = await authApi.login(values);
      setTokens(auth.accessToken, auth.refreshToken);
      const user = await authApi.me();
      setUser(user);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t.login.error;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: "linear-gradient(145deg, #432D51 0%, #593E67 50%, #84495F 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEA837]">
            <Zap className="h-5 w-5 text-[#432D51]" fill="currentColor" />
          </div>
          <span className="text-white font-bold text-lg">miniERP</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Quản lý kinh doanh<br />thông minh hơn
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Hệ thống ERP cho doanh nghiệp điện tử — quản lý khách hàng, đơn hàng, kho hàng và tài chính trong một nền tảng.
            </p>
          </div>

          {/* Feature dots */}
          <div className="space-y-3">
            {[
              { label: "Quản lý catalog sản phẩm", color: "bg-[#FEA837]" },
              { label: "Theo dõi đơn hàng & giao vận", color: "bg-[#DE741C]" },
              { label: "Báo cáo tài chính tự động", color: "bg-[#B85B56]" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${color} shrink-0`} />
                <span className="text-white/80 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2026 miniERP Electronic</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-[#F8F8F8] px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#593E67]">
              <Zap className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <span className="text-[#593E67] font-bold text-xl">miniERP</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Đăng nhập</h2>
            <p className="text-sm text-gray-500">{t.login.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">{t.login.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mini-erp.local"
                  className="pl-9 bg-white border-gray-200 focus:border-[#593E67] focus:ring-[#593E67]/20 h-11"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">{t.login.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-white border-gray-200 focus:border-[#593E67] focus:ring-[#593E67]/20 h-11"
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold"
              variant="brand"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t.login.signingIn : t.login.signIn}
            </Button>
          </form>

          {/* Color stripe */}
          <div className="flex gap-1 justify-center">
            {["#593E67", "#84495F", "#B85B56", "#DE741C", "#FEA837"].map((c) => (
              <div key={c} className="h-1 flex-1 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
