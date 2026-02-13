"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { CHECK_EMAIL_AVAILABILITY } from "@/lib/graphql/queries";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import Image from "next/image";

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
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
  const [checkEmail] = useLazyQuery<CheckEmailData>(CHECK_EMAIL_AVAILABILITY);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

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

      const { token } = (result.data as { register: { token: string } }).register;
      Cookies.set("token", token, { expires: 7, sameSite: "lax", secure: true });

      toast.success("Registrasi berhasil!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registrasi gagal";
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

      {/* Right Column - Form */}
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
            <h1 className="text-2xl font-bold">Buat Akun</h1>
            <p className="text-muted-foreground">Mulai kelola keuangan kamu dengan MoneyBro</p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
