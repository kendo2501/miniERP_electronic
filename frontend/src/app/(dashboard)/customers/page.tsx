"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Building2, Phone, Mail, AlertCircle, TrendingDown, UserCheck, UserPlus, UserX, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listCustomers, createCustomer, getCustomer, getCustomerBalance, createPortalAccount, unlinkPortalAccount, addCustomerAddress, updateCustomerAddress, deleteCustomerAddress } from "@/lib/api/sales";
import type { CustomerType, CustomerBalanceInvoice, CustomerAddress } from "@/types/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

const portalSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  fullName: z.string().optional(),
});
type PortalFormValues = z.infer<typeof portalSchema>;

const schema = z.object({
  customerCode: z.string().optional(),
  companyName: z.string().min(1, "Bắt buộc"),
  contactName: z.string().optional(),
  email: z.string().email("Email không hợp lệ"),
  phone: z
    .string()
    .regex(/^\d{9,11}$/, "Số điện thoại phải gồm 9–11 chữ số")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  creditLimit: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE"]).optional(),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

type FormValues = z.infer<typeof schema>;

function vnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function TypeBadge({ type }: { type?: CustomerType | null }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge variant={type === "WHOLESALE" ? "default" : "secondary"} className="text-xs">
      {type === "WHOLESALE" ? "Bán buôn" : "Bán lẻ"}
    </Badge>
  );
}

function InvoiceStatusBadge({ status, dueDate }: { status: string; dueDate?: string }) {
  const overdue = status !== "PAID" && dueDate && new Date(dueDate) < new Date();
  if (status === "PAID") return <Badge variant="outline" className="text-xs text-green-600">Đã trả</Badge>;
  if (overdue) return <Badge variant="destructive" className="text-xs">Quá hạn</Badge>;
  return <Badge variant="secondary" className="text-xs">Chưa trả</Badge>;
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [balanceCustomer, setBalanceCustomer] = useState<{ id: number; name: string } | null>(null);
  const [portalTarget, setPortalTarget] = useState<{ id: number; name: string } | null>(null);
  const [addressCustomer, setAddressCustomer] = useState<{ id: number; name: string } | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addrLabel, setAddrLabel] = useState("");
  const [addrText, setAddrText] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () => listCustomers({ page, limit: 20, search: search || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["customer-balance", balanceCustomer?.id],
    queryFn: () => getCustomerBalance(balanceCustomer!.id).then((r) => r.data),
    enabled: !!balanceCustomer,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCustomer({
        customerCode: values.customerCode?.trim() || undefined,
        companyName: values.companyName,
        email: values.email,
        password: values.password,
        contactName: values.contactName || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        taxCode: values.taxCode || undefined,
        creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : undefined,
        customerType: values.customerType,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.customers.customerCreatedWithAccount);
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowCreate(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.customers.errorCreate),
  });

  const { register: registerPortal, handleSubmit: handlePortalSubmit, reset: resetPortal, formState: { errors: portalErrors } } = useForm<PortalFormValues>({
    resolver: zodResolver(portalSchema),
  });

  const portalMut = useMutation({
    mutationFn: (values: PortalFormValues) =>
      createPortalAccount(portalTarget!.id, { email: values.email, password: values.password, fullName: values.fullName || undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Đã tạo tài khoản portal thành công");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setPortalTarget(null);
      resetPortal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Tạo tài khoản thất bại"),
  });

  const unlinkMut = useMutation({
    mutationFn: (id: number) => unlinkPortalAccount(id),
    onSuccess: () => {
      toast.success("Đã hủy liên kết tài khoản");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Hủy liên kết thất bại"),
  });

  const { data: customerDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["customer-detail", addressCustomer?.id],
    queryFn: () => getCustomer(addressCustomer!.id).then((r) => r.data),
    enabled: !!addressCustomer,
  });

  const addAddressMut = useMutation({
    mutationFn: (data: { label?: string; address: string; isDefault?: boolean }) =>
      addCustomerAddress(addressCustomer!.id, data),
    onSuccess: () => {
      toast.success(t.customers.addressAdded);
      qc.invalidateQueries({ queryKey: ["customer-detail", addressCustomer?.id] });
      resetAddressForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Thêm địa chỉ thất bại"),
  });

  const updateAddressMut = useMutation({
    mutationFn: ({ addressId, data }: { addressId: number; data: { label?: string; address?: string; isDefault?: boolean } }) =>
      updateCustomerAddress(addressCustomer!.id, addressId, data),
    onSuccess: () => {
      toast.success(t.customers.addressUpdated);
      qc.invalidateQueries({ queryKey: ["customer-detail", addressCustomer?.id] });
      resetAddressForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Cập nhật địa chỉ thất bại"),
  });

  const deleteAddressMut = useMutation({
    mutationFn: (addressId: number) => deleteCustomerAddress(addressCustomer!.id, addressId),
    onSuccess: () => {
      toast.success(t.customers.addressDeleted);
      qc.invalidateQueries({ queryKey: ["customer-detail", addressCustomer?.id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Xóa địa chỉ thất bại"),
  });

  function openEditAddress(addr: CustomerAddress) {
    setEditingAddress(addr);
    setAddrLabel(addr.label ?? "");
    setAddrText(addr.address);
    setAddrIsDefault(addr.isDefault);
    setShowAddressForm(true);
  }

  function resetAddressForm() {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddrLabel("");
    setAddrText("");
    setAddrIsDefault(false);
  }

  function submitAddressForm() {
    if (!addrText.trim()) return;
    if (editingAddress) {
      updateAddressMut.mutate({ addressId: editingAddress.id, data: { label: addrLabel || undefined, address: addrText, isDefault: addrIsDefault } });
    } else {
      addAddressMut.mutate({ label: addrLabel || undefined, address: addrText, isDefault: addrIsDefault });
    }
  }

  const canCreate = hasPermission("customer.create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.customers.title}</h1>
          <p className="text-muted-foreground mt-1">{t.customers.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            {t.customers.newCustomer}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.customers.searchPlaceholder}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.customers.totalCustomers}</span>}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.customerCode}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.companyName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.customerType}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.contactName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.phone}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.email}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Tài khoản portal</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.date}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground"></th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{c.customerCode}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {c.companyName}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <TypeBadge type={c.customerType as CustomerType} />
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{c.contactName ?? "—"}</td>
                      <td className="px-6 py-3">
                        {c.phone ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />{c.phone}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {c.email ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />{c.email}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {c.linkedUser ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-green-700 truncate">{c.linkedUser.fullName}</div>
                              <div className="text-xs text-muted-foreground truncate">{c.linkedUser.email}</div>
                            </div>
                            {canCreate && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 shrink-0"
                                title="Hủy liên kết"
                                onClick={() => unlinkMut.mutate(c.id)}
                                disabled={unlinkMut.isPending}>
                                <UserX className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Chưa có</span>
                            {canCreate && (
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs gap-1 text-blue-600 hover:text-blue-700"
                                onClick={() => { setPortalTarget({ id: c.id, name: c.companyName }); resetPortal(); }}>
                                <UserPlus className="h-3 w-3" /> Tạo
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-3">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                          onClick={() => setBalanceCustomer({ id: c.id, name: c.companyName })}
                        >
                          <TrendingDown className="h-3 w-3" />
                          {t.customers.viewBalance}
                        </Button>
                      </td>
                      <td className="px-6 py-3">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700"
                          onClick={() => { setAddressCustomer({ id: c.id, name: c.companyName }); resetAddressForm(); }}
                        >
                          <MapPin className="h-3 w-3" />
                          {t.customers.addresses}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">{t.customers.noCustomers}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-muted-foreground">{t.common.page} {data.page} {t.common.of} {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>{t.common.previous}</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>{t.common.next}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.customers.createTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
            {/* Customer code + company name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.customers.customerCode}</Label>
                <Input placeholder={t.customers.codePlaceholder} {...register("customerCode")} />
                <p className="text-xs text-muted-foreground">{t.customers.autoCode}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t.customers.customerType}</Label>
                <Select onValueChange={(v) => setValue("customerType", v as "RETAIL" | "WHOLESALE")} defaultValue="RETAIL">
                  <SelectTrigger><SelectValue placeholder={t.customers.selectType} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">{t.customers.retail}</SelectItem>
                    <SelectItem value="WHOLESALE">{t.customers.wholesale}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.customers.companyName} *</Label>
              <Input placeholder={t.customers.companyPlaceholder} {...register("companyName")} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.customers.contactName}</Label>
                <Input placeholder={t.customers.contactPlaceholder} {...register("contactName")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.customers.phone}</Label>
                <Input placeholder={t.customers.phonePlaceholder} {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>
            {/* Email + Password (portal account) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.common.email} *</Label>
                <Input type="email" placeholder={t.customers.emailPlaceholder} {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.customers.password} *</Label>
                <Input type="password" placeholder={t.customers.passwordPlaceholder} {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              {t.customers.portalAccountNote}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.customers.taxCode}</Label>
                <Input placeholder="0123456789" {...register("taxCode")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.customers.creditLimit} (₫)</Label>
                <Input type="number" min="0" step="1000" placeholder="5000000" {...register("creditLimit")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.address}</Label>
              <Input placeholder={t.customers.addressPlaceholder} {...register("address")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.customers.newCustomer}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Portal Account Dialog */}
      <Dialog open={!!portalTarget} onOpenChange={(v) => { if (!v) { setPortalTarget(null); resetPortal(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Tạo tài khoản portal — {portalTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePortalSubmit((v) => portalMut.mutate(v))} className="space-y-4 pt-2">
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              Tài khoản này sẽ được gắn với khách hàng <strong>{portalTarget?.name}</strong> và có quyền xem đơn hàng, báo giá trên portal.
            </div>
            <div className="space-y-1.5">
              <Label>Họ tên hiển thị</Label>
              <Input placeholder={portalTarget?.name} {...registerPortal("fullName")} />
              <p className="text-xs text-muted-foreground">Để trống sẽ dùng tên công ty</p>
            </div>
            <div className="space-y-1.5">
              <Label>Email đăng nhập *</Label>
              <Input type="email" placeholder="email@example.com" {...registerPortal("email")} />
              {portalErrors.email && <p className="text-xs text-destructive">{portalErrors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu *</Label>
              <Input type="password" placeholder="Tối thiểu 8 ký tự" {...registerPortal("password")} />
              {portalErrors.password && <p className="text-xs text-destructive">{portalErrors.password.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setPortalTarget(null); resetPortal(); }}>Hủy</Button>
              <Button type="submit" disabled={portalMut.isPending}>
                {portalMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Address Management Dialog */}
      <Dialog open={!!addressCustomer} onOpenChange={(v) => { if (!v) { setAddressCustomer(null); resetAddressForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {t.customers.addresses} — {addressCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {/* Address list */}
              {!customerDetail?.addresses || customerDetail.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t.customers.noAddresses}</p>
              ) : (
                <div className="space-y-2">
                  {customerDetail.addresses.map((addr, idx) => (
                    <div key={addr.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{addr.label || `${t.customers.addresses} ${idx + 1}`}</span>
                          {addr.isDefault && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">{t.customers.defaultBadge}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{addr.address}</p>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditAddress(addr)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteAddressMut.mutate(addr.id)}
                          disabled={deleteAddressMut.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit form */}
              {showAddressForm ? (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                  <p className="text-sm font-medium">{editingAddress ? t.customers.editAddress : t.customers.addAddress}</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.customers.addressLabel}</Label>
                    <Input placeholder="VD: Kho HCM, Văn phòng..." value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.customers.addressText} *</Label>
                    <Input placeholder="Số nhà, đường, quận/huyện..." value={addrText} onChange={(e) => setAddrText(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isDefault" checked={addrIsDefault} onChange={(e) => setAddrIsDefault(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    <Label htmlFor="isDefault" className="text-xs cursor-pointer">{t.customers.setDefault}</Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={resetAddressForm}>{t.common.cancel}</Button>
                    <Button size="sm" onClick={submitAddressForm} disabled={!addrText.trim() || addAddressMut.isPending || updateAddressMut.isPending}>
                      {(addAddressMut.isPending || updateAddressMut.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      {t.common.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setShowAddressForm(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t.customers.addAddress}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={!!balanceCustomer} onOpenChange={(v) => { if (!v) setBalanceCustomer(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              {t.customers.balanceTitle} — {balanceCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {balanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : balanceData ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">{t.customers.totalDebt}</p>
                  <p className={`text-lg font-bold ${balanceData.totalDebt > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {vnd(balanceData.totalDebt)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">{t.customers.overdueDebt}</p>
                  <p className={`text-lg font-bold ${balanceData.overdueDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                    {balanceData.overdueDebt > 0 && <AlertCircle className="inline h-4 w-4 mr-1" />}
                    {vnd(balanceData.overdueDebt)}
                  </p>
                </div>
              </div>

              {/* Invoice list */}
              {balanceData.invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{t.customers.noInvoices}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-8 px-3 text-left font-medium text-muted-foreground text-xs">Số HĐ</th>
                      <th className="h-8 px-3 text-left font-medium text-muted-foreground text-xs">Đơn hàng</th>
                      <th className="h-8 px-3 text-left font-medium text-muted-foreground text-xs">Trạng thái</th>
                      <th className="h-8 px-3 text-right font-medium text-muted-foreground text-xs">Tổng tiền</th>
                      <th className="h-8 px-3 text-right font-medium text-muted-foreground text-xs">Còn nợ</th>
                      <th className="h-8 px-3 text-left font-medium text-muted-foreground text-xs">Hạn TT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData.invoices.map((inv: CustomerBalanceInvoice) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{inv.salesOrder?.orderNumber ?? "—"}</td>
                        <td className="px-3 py-2">
                          <InvoiceStatusBadge status={inv.status} dueDate={inv.dueDate} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-xs">{vnd(Number(inv.totalAmount))}</td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-orange-600">
                          {Number(inv.outstandingAmount) > 0 ? vnd(Number(inv.outstandingAmount)) : <span className="text-green-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("vi-VN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
