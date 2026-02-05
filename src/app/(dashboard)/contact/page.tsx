"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronLeft, Mail, Github } from "lucide-react";

interface ContactItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  href: string;
}

function ContactItem({ icon, title, description, action, href }: ContactItemProps) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm">{action}</Button>
    </a>
  );
}

export default function ContactPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Hubungi Kami</h1>
          <p className="text-muted-foreground">Ada pertanyaan atau masukan? Kami siap membantu</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card divide-y divide-border">
        <ContactItem
          icon={<Mail className="h-6 w-6 text-primary" />}
          title="Email"
          description="support@moneybro.org"
          action="Kirim Email"
          href="mailto:support@moneybro.org"
        />
        <ContactItem
          icon={<Github className="h-6 w-6 text-primary" />}
          title="GitHub"
          description="Laporkan bug atau request fitur"
          action="Buka"
          href="https://github.com/moneybro/moneybro"
        />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">FAQ</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="2fa">
            <AccordionTrigger>Bagaimana cara mengaktifkan 2FA?</AccordionTrigger>
            <AccordionContent>
              Buka halaman Profile, scroll ke bagian Keamanan, lalu aktifkan Two-Factor Authentication. Setiap login akan memerlukan kode OTP yang dikirim ke email.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="notifikasi">
            <AccordionTrigger>Bagaimana cara kerja notifikasi pengingat?</AccordionTrigger>
            <AccordionContent>
              Buka Pengaturan → Notifikasi untuk mengatur pengingat. Email akan dikirim setiap pukul 08:00 WIB sesuai jumlah hari yang kamu pilih sebelum jatuh tempo.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="lunas">
            <AccordionTrigger>Bagaimana menkamui cicilan/hutang sudah lunas?</AccordionTrigger>
            <AccordionContent>
              Buka detail cicilan atau hutang, lalu klik tombol &quot;Tkamui Lunas&quot;. Status akan berubah menjadi Completed dan tidak akan menerima pengingat lagi.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="keamanan">
            <AccordionTrigger>Apakah data saya aman?</AccordionTrigger>
            <AccordionContent>
              Ya, data kamu dienkripsi dan disimpan dengan aman. Kami tidak menjual data pengguna. Lihat Privacy Policy untuk detail.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="hapus-akun">
            <AccordionTrigger>Bagaimana cara menghapus akun?</AccordionTrigger>
            <AccordionContent>
              Buka halaman Profile, scroll ke bagian Zona Berbahaya, lalu klik &quot;Hapus Akun&quot;. Semua data akan dihapus permanen.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="gratis">
            <AccordionTrigger>Apakah aplikasi ini gratis?</AccordionTrigger>
            <AccordionContent>
              MoneyBro gratis untuk penggunaan pribadi. Penggunaan komersial tidak diizinkan tanpa izin.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
