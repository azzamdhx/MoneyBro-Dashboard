"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GET_ME, CHECK_EMAIL_AVAILABILITY } from "@/lib/graphql/queries";
import { UPDATE_PROFILE, CHANGE_PASSWORD, ENABLE_2FA, DISABLE_2FA, DELETE_ACCOUNT } from "@/lib/graphql/mutations";
import { ChevronLeft, User, Mail, Calendar, Loader2, Lock, Shield, Pencil, X, Check, Eye, EyeOff, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface UserData {
  me: {
    id: string;
    email: string;
    name: string;
    twoFAEnabled: boolean;
    createdAt: string;
    updatedAt?: string;
  };
}

interface CheckEmailData {
  checkEmailAvailability: boolean;
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">{title}</h2>
      <div className="rounded-xl border bg-card divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const { data, loading } = useQuery<UserData>(GET_ME);

  const [checkEmail] = useLazyQuery<CheckEmailData>(CHECK_EMAIL_AVAILABILITY);

  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: GET_ME }],
  });

  const [changePassword, { loading: changingPassword }] = useMutation(CHANGE_PASSWORD);

  const [enable2FA, { loading: enabling2FA }] = useMutation(ENABLE_2FA, {
    refetchQueries: [{ query: GET_ME }],
  });

  const [disable2FA, { loading: disabling2FA }] = useMutation(DISABLE_2FA, {
    refetchQueries: [{ query: GET_ME }],
  });

  // 2FA dialog state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAPassword, setTwoFAPassword] = useState("");
  const [showTwoFAPassword, setShowTwoFAPassword] = useState(false);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const [deleteAccount, { loading: deletingAccount }] = useMutation(DELETE_ACCOUNT);

  const user = data?.me;

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (!isEditing || !editEmail || editEmail === user?.email) {
      setEmailError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const { data } = await checkEmail({ variables: { email: editEmail } });
        if (data?.checkEmailAvailability === false) {
          setEmailError("Email sudah digunakan");
        } else {
          setEmailError(null);
        }
      } catch {
        setEmailError(null);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editEmail, isEditing, user?.email, checkEmail]);

  const handleStartEdit = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    if (!editEmail.trim()) {
      toast.error("Email tidak boleh kosong");
      return;
    }
    if (emailError) {
      toast.error(emailError);
      return;
    }
    try {
      await updateProfile({
        variables: {
          input: {
            name: editName.trim(),
            email: editEmail.trim(),
          },
        },
      });
      toast.success("Profil berhasil diperbarui");
      setIsEditing(false);
    } catch {
      toast.error("Gagal memperbarui profil");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    
    if (!currentPassword) {
      setPasswordError("Password saat ini harus diisi");
      return;
    }
    if (!newPassword) {
      setPasswordError("Password baru harus diisi");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak sama");
      return;
    }

    try {
      await changePassword({
        variables: {
          input: {
            currentPassword: currentPassword,
            password: newPassword,
          },
        },
      });
      toast.success("Password berhasil diubah");
      handleClosePasswordDialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mengubah password";
      if (message.includes("tidak valid")) {
        setPasswordError("Password saat ini tidak valid");
      } else {
        toast.error(message);
      }
    }
  };

  const handleClosePasswordDialog = () => {
    setShowPasswordDialog(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleToggle2FA = async () => {
    if (!twoFAPassword) {
      toast.error("Masukkan password untuk konfirmasi");
      return;
    }

    try {
      if (user?.twoFAEnabled) {
        await disable2FA({ variables: { password: twoFAPassword } });
        toast.success("Autentikasi dua faktor berhasil dinonaktifkan");
      } else {
        await enable2FA({ variables: { password: twoFAPassword } });
        toast.success("Autentikasi dua faktor berhasil diaktifkan");
      }
      handleClose2FADialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mengubah pengaturan 2FA";
      toast.error(message);
    }
  };

  const handleClose2FADialog = () => {
    setShow2FADialog(false);
    setTwoFAPassword("");
    setShowTwoFAPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Masukkan password untuk konfirmasi");
      return;
    }

    try {
      await deleteAccount({ variables: { input: { password: deletePassword } } });
      toast.success("Akun berhasil dihapus");
      // Clear token and redirect to login
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menghapus akun";
      toast.error(message);
    }
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletePassword("");
    setShowDeletePassword(false);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-20" />
        </div>

        {/* Avatar Skeleton */}
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Sections Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24 ml-4 mb-2" />
            <div className="rounded-xl border bg-card divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20 ml-4 mb-2" />
            <div className="rounded-xl border bg-card divide-y divide-border">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Edit Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profil Saya</h1>
            <p className="text-muted-foreground">Kelola informasi akun kamu</p>
          </div>
        </div>
        {isEditing ? (
          <div className="flex gap-2 w-fit">
            <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Simpan
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartEdit} className="w-fit">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{user?.name || "User"}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile Info */}
        <ProfileSection title="Informasi Akun">
          <div className="flex items-center gap-4 p-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Nama Lengkap</p>
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{user?.name || "-"}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Email</p>
              {isEditing ? (
                <div className="mt-1 space-y-1">
                  <div className="relative">
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      className={emailError ? "border-destructive" : ""}
                    />
                    {isCheckingEmail && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>
              ) : (
                <p className="font-medium">{user?.email || "-"}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Bergabung Sejak</p>
              <p className="font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID", { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                }) : "-"}
              </p>
            </div>
          </div>
        </ProfileSection>

        {/* Security */}
        <ProfileSection title="Keamanan">
          <button
            onClick={() => setShowPasswordDialog(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Ubah Password</p>
              <p className="text-sm text-muted-foreground">Perbarui password akun kamu</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShow2FADialog(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Autentikasi Dua Faktor</p>
              <p className="text-sm text-muted-foreground">
                {user?.twoFAEnabled ? "Nonaktifkan 2FA" : "Aktifkan lapisan keamanan ekstra"}
              </p>
            </div>
            {user?.twoFAEnabled ? (
              <Badge variant="default" className="bg-green-500">Aktif</Badge>
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </ProfileSection>

        {/* Danger Zone */}
        <ProfileSection title="Zona Berbahaya">
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-destructive/10 transition-colors text-left"
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive">Hapus Akun</p>
              <p className="text-sm text-muted-foreground">
                Hapus akun dan semua data secara permanen
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </ProfileSection>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={handleClosePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
            <DialogDescription>
              Masukkan password saat ini dan password baru kamu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="current-password">Password Saat Ini</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  onClick={handleClosePasswordDialog}
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClosePasswordDialog}>
              Batal
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={handleClose2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user?.twoFAEnabled ? "Nonaktifkan" : "Aktifkan"} Autentikasi Dua Faktor
            </DialogTitle>
            <DialogDescription>
              {user?.twoFAEnabled
                ? "Masukkan password kamu untuk menonaktifkan autentikasi dua faktor."
                : "Aktifkan autentikasi dua faktor untuk keamanan ekstra. kamu akan menerima kode verifikasi via email setiap kali login."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="2fa-password">Password</Label>
              <div className="relative">
                <Input
                  id="2fa-password"
                  type={showTwoFAPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={twoFAPassword}
                  onChange={(e) => setTwoFAPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowTwoFAPassword(!showTwoFAPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showTwoFAPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose2FADialog}>
              Batal
            </Button>
            <Button 
              onClick={handleToggle2FA} 
              disabled={enabling2FA || disabling2FA}
              variant={user?.twoFAEnabled ? "destructive" : "default"}
            >
              {(enabling2FA || disabling2FA) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user?.twoFAEnabled ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={handleCloseDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Hapus Akun</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data kamu akan dihapus permanen termasuk cicilan, hutang, pengeluaran, dan pemasukan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              Batal
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount} 
              disabled={deletingAccount}
            >
              {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Akun
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
