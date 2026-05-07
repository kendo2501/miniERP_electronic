"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { usersApi } from "@/lib/api/users";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  fullName: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: Props) {
  const { t } = useLanguage();
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<{ items: { id: number; name: string; code: string }[] }>("/roles").then((r) => r.data),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => usersApi.create(values),
    onSuccess: () => {
      toast.success(t.users.created);
      reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? t.users.errorCreate;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.users.createTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.common.email} *</Label>
            <Input type="email" placeholder={t.login.emailPlaceholder} {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t.users.password} *</Label>
            <Input type="password" placeholder={t.users.passwordPlaceholder} {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t.users.fullName}</Label>
            <Input placeholder={t.users.namePlaceholder} {...register("fullName")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
