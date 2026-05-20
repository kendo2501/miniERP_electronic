"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sun, Moon, Monitor, Languages, Lock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { t, lang, toggleLang } = useLanguage();
  const { theme, setTheme } = useTheme();

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PasswordForm>();

  const changePasswordMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post("/auth/change-password", data),
    onSuccess: () => {
      toast.success(t.settings.passwordChanged);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const onSubmit = (values: PasswordForm) => {
    if (!values.currentPassword) {
      setError("currentPassword", { message: t.settings.currentPasswordRequired });
      return;
    }
    if (values.newPassword.length < 8) {
      setError("newPassword", { message: t.settings.passwordTooShort });
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setError("confirmPassword", { message: t.settings.passwordMismatch });
      return;
    }
    changePasswordMut.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t.settings.languageLabel}</CardTitle>
          </div>
          <CardDescription>{t.settings.languageDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={lang === "vi" ? "default" : "outline"}
              size="sm"
              onClick={() => lang !== "vi" && toggleLang()}
            >
              Tiếng Việt
            </Button>
            <Button
              variant={lang === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => lang !== "en" && toggleLang()}
            >
              English
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t.settings.appearance}</CardTitle>
          </div>
          <CardDescription>{t.settings.appearanceDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              {t.settings.themeLight}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              {t.settings.themeDark}
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-4 w-4" />
              {t.settings.themeSystem}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t.settings.changePassword}</CardTitle>
          </div>
          <CardDescription>{t.settings.passwordDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-sm">
            <div className="space-y-1.5">
              <Label>{t.settings.currentPassword}</Label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t.settings.newPassword}</Label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t.settings.confirmPassword}</Label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={changePasswordMut.isPending} className="gap-1.5">
              {changePasswordMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.settings.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
