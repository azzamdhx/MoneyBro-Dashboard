"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

import { RESET_PASSWORD } from "@/lib/graphql/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak sama",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error("Token tidak valid");
      return;
    }

    try {
      await resetPassword({
        variables: {
          input: {
            token,
            password: data.password,
          },
        },
      });
      
      setResetSuccess(true);
      toast.success("Password berhasil direset!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal reset password";
      toast.error(message);
    }
  };

  if (!token) {
    return (
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="hidden lg:block relative overflow-hidden">
          <BackgroundGradientAnimation
            containerClassName="!h-full !w-full !relative !top-0 !left-0"
            interactive={false}
          />
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <Image
                src="/primary-logo.png"
                alt="MoneyBro"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-destructive">Link Tidak Valid</h1>
              <p className="text-muted-foreground">
                Link reset password tidak valid atau sudah kadaluarsa.
              </p>
            </div>
            <Link href="/forgot-password">
              <Button className="w-full">Minta Link Baru</Button>
            </Link>
            <div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke halaman login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="hidden lg:block relative overflow-hidden">
          <BackgroundGradientAnimation
            containerClassName="!h-full !w-full !relative !top-0 !left-0"
            interactive={false}
          />
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <Image
                src="/primary-logo.png"
                alt="MoneyBro"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-income">Password Berhasil Direset</h1>
              <p className="text-muted-foreground">
                Password kamu telah berhasil diperbarui. Silakan login dengan password baru.
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Masuk Sekarang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      <div className="hidden lg:block relative overflow-hidden">
        <BackgroundGradientAnimation
          containerClassName="!h-full !w-full !relative !top-0 !left-0"
          interactive={false}
        />
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Image
              src="/primary-logo.png"
              alt="MoneyBro"
              width={48}
              height={48}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground">Masukkan password baru untuk akun kamu</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="••••••••" type={showPassword ? "text" : "password"} {...field} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="••••••••" type={showConfirmPassword ? "text" : "password"} {...field} />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke halaman login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
