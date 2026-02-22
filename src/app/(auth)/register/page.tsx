"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { CHECK_EMAIL_AVAILABILITY } from "@/lib/graphql/queries";
import { RESEND_2FA_CODE } from "@/lib/graphql/mutations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/ui/otp-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import Image from "next/image";

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      requires2FA
      tempToken
    }
  }
`;

const VERIFY_REGISTRATION_MUTATION = gql`
  mutation VerifyRegistration($input: Verify2FAInput!) {
    verifyRegistration(input: $input) {
      token
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak sama",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

interface CheckEmailData {
  checkEmailAvailability: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [register, { loading }] = useMutation(REGISTER_MUTATION);
  const [verifyRegistration, { loading: verifying }] = useMutation(VERIFY_REGISTRATION_MUTATION);
  const [resend2FACode, { loading: resending }] = useMutation(RESEND_2FA_CODE);
  const [checkEmail] = useLazyQuery<CheckEmailData>(CHECK_EMAIL_AVAILABILITY);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // OTP verification state
  const [step, setStep] = useState<"register" | "otp">("register");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const emailValue = form.watch("email");

  useEffect(() => {
    if (!emailValue || emailValue.length < 5 || !emailValue.includes("@")) {
      setEmailError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const { data } = await checkEmail({ variables: { email: emailValue } });
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
  }, [emailValue, checkEmail]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: RegisterForm) => {
    if (emailError) {
      toast.error(emailError);
      return;
    }
    try {
      const result = await register({
        variables: {
          input: {
            name: data.name,
            email: data.email,
            password: data.password,
          },
        },
      });

      const registerData = (result.data as {
        register: { requires2FA: boolean; tempToken: string }
      }).register;

      setTempToken(registerData.tempToken);
      setRegisteredEmail(data.email);
      setStep("otp");
      toast.info("Kode verifikasi telah dikirim ke email kamu");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registrasi gagal";
      toast.error(message);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tempToken || otpCode.length !== 6) return;

    try {
      const { data } = await verifyRegistration({
        variables: {
          input: { tempToken, code: otpCode },
        },
      });

      const verifyData = data as { verifyRegistration?: { token: string; refreshToken: string } };
      if (verifyData?.verifyRegistration?.token) {
        Cookies.set("token", verifyData.verifyRegistration.token, { expires: 1, sameSite: "lax", secure: true });
        if (verifyData.verifyRegistration.refreshToken) {
          Cookies.set("refreshToken", verifyData.verifyRegistration.refreshToken, { expires: 90, sameSite: "lax", secure: true });
        }
        toast.success("Registrasi berhasil! 2FA telah aktif.");
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
      await resend2FACode({ variables: { tempToken } });
      toast.success("Kode verifikasi baru telah dikirim!");
      setCountdown(60);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mengirim ulang kode";
      toast.error(message);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* Left Column - Background Animation */}
      <div className="hidden lg:block relative overflow-hidden">
        <BackgroundGradientAnimation
          containerClassName="!h-full !w-full !relative !top-0 !left-0"
          interactive={false}
        />
      </div>

      {/* Right Column */}
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
            {step === "register" ? (
              <>
                <h1 className="text-2xl font-bold">Buat Akun</h1>
                <p className="text-muted-foreground">Mulai kelola keuangan kamu dengan MoneyBro</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">Verifikasi Email</h1>
                <p className="text-muted-foreground">
                  Masukkan kode 6 digit yang telah dikirim ke <span className="font-medium text-foreground">{registeredEmail}</span>
                </p>
              </>
            )}
          </div>

          {step === "register" ? (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama</FormLabel>
                        <FormControl>
                          <Input placeholder="Baso Halim" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="email@example.com"
                              type="email"
                              className={emailError ? "border-destructive" : ""}
                              {...field}
                            />
                            {isCheckingEmail && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </FormControl>
                        {emailError ? (
                          <p className="text-xs text-destructive">{emailError}</p>
                        ) : (
                          <FormMessage />
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
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
                  <p className="text-xs text-muted-foreground text-center">
                    Dengan mendaftar, kamu menyetujui{" "}
                    <a href="https://moneybro.my.id/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Syarat & Ketentuan
                    </a>{" "}
                    dan{" "}
                    <a href="https://moneybro.my.id/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Kebijakan Privasi
                    </a>
                  </p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Daftar
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-primary hover:text-accent">
                  Masuk
                </Link>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <OTPInput
                    value={otpCode}
                    onChange={setOtpCode}
                    length={6}
                    disabled={verifying}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying || otpCode.length !== 6}>
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verifikasi & Aktifkan 2FA
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
                <button
                  onClick={() => { setStep("register"); setOtpCode(""); setTempToken(null); }}
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke form registrasi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
