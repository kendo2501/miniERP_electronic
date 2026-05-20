"use client";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api/users";
import { useLanguage } from "@/context/language-context";
import type { User } from "@/types/user";

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

export function ResetPasswordDialog({ user, open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: ({ newPassword }: FormValues) =>
      usersApi.resetPassword(user!.id, newPassword),
    onSuccess: () => {
      toast.success(t.users.resetPasswordSuccess);
      qc.invalidateQueries({ queryKey: ["users"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.users.resetPasswordError),
  });

  const onSubmit = (values: FormValues) => {
    if (values.newPassword.length < 8) {
      setError("newPassword", { message: t.settings.passwordTooShort });
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setError("confirmPassword", { message: t.settings.passwordMismatch });
      return;
    }
    mutation.mutate(values);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <DialogTitle>{t.users.resetPasswordTitle}</DialogTitle>
          </div>
          <DialogDescription>
            <span className="font-medium text-foreground">{user?.fullName}</span>
            {" · "}
            <span className="text-muted-foreground">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">{t.users.resetPasswordDesc}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label>{t.users.newPassword}</Label>
            <Input type="password" placeholder="••••••••" {...register("newPassword")} />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t.settings.confirmPassword}</Label>
            <Input type="password" placeholder="••••••••" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mutation.isPending ? t.users.resetting : t.users.resetPassword}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
