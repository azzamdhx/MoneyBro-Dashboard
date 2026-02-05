"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@apollo/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

import { FORGOT_PASSWORD } from "@/lib/graphql/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await forgotPassword({
        variables: { input: { email: data.email } },
      });
      
      setSentEmail(data.email);
      setEmailSent(true);
      toast.success("Email reset password telah dikirim!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mengirim email";
      toast.error(message);
    }
  };

  if (emailSent) {
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
              <h1 className="text-2xl font-bold">Cek Email kamu</h1>
              <p className="text-muted-foreground">
                Kami telah mengirim link reset password ke <strong>{sentEmail}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Jika email tidak muncul dalam beberapa menit, periksa folder spam kamu.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                form.reset();
              }}
            >
              Kirim ulang email
            </Button>
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
            <h1 className="text-2xl font-bold">Lupa Password?</h1>
            <p className="text-muted-foreground">
              Masukkan email kamu dan kami akan mengirimkan link untuk reset password
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Link Reset
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
