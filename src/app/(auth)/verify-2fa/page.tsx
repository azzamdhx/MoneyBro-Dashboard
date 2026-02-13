"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import Cookies from "js-cookie";
import { VERIFY_2FA, RESEND_2FA_CODE } from "@/lib/graphql/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get("token");
  
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  
  const [verify2FA, { loading: verifying }] = useMutation(VERIFY_2FA);
  const [resend2FACode, { loading: resending }] = useMutation(RESEND_2FA_CODE);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tempToken) {
      toast.error("Token tidak valid");
      return;
    }

    if (!code || code.length !== 6) {
      toast.error("Masukkan kode 6 digit");
      return;
    }

    try {
      const { data } = await verify2FA({
        variables: {
          input: {
            tempToken,
            code,
          },
        },
      });

      const verifyData = data as { verify2FA?: { token: string } };
      if (verifyData?.verify2FA?.token) {
        Cookies.set("token", verifyData.verify2FA.token, { expires: 7, sameSite: "lax", secure: true });
        toast.success("Verifikasi berhasil!");
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Verifikasi gagal";
      toast.error(message);
    }
  };

  const handleResend = async () => {
    if (!tempToken || countdown > 0) return;

    try {
      await resend2FACode({
        variables: { tempToken },
      });
      toast.success("Kode verifikasi baru telah dikirim!");
      setCountdown(60);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mengirim ulang kode";
      toast.error(message);
    }
  };

  if (!tempToken) {
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
              <h1 className="text-2xl font-bold text-destructive">Sesi Tidak Valid</h1>
              <p className="text-muted-foreground">
                Sesi verifikasi tidak valid atau sudah kadaluarsa.
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full">Kembali ke Login</Button>
            </Link>
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
            <h1 className="text-2xl font-bold">Verifikasi Dua Faktor</h1>
            <p className="text-muted-foreground">
              Masukkan kode 6 digit yang telah dikirim ke email kamu
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Verifikasi</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verifikasi
            </Button>
          </form>
          
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Tidak menerima kode?{" "}
              <button
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  "Mengirim..."
                ) : countdown > 0 ? (
                  `Kirim ulang (${countdown}s)`
                ) : (
                  "Kirim ulang"
                )}
              </button>
            </p>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  );
}
