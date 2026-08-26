import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "MetaCoach — Adaptif Sağlık & Beslenme",
  description:
    "Kan tahlili ve InBody'yi AI ile okuyan, giyilebilir veriyi birleştiren, gerçek metabolizmanı öğrenen sağlık platformu.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MetaCoach" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0e9e8e",
  width: "device-width",
  initialScale: 1,
};

// Pre-paint theme to avoid a flash of the wrong color scheme.
const noFlash = `(function(){try{var t=localStorage.getItem('mc-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let user: { name: string; email: string; role: string } | null = null;
  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { name: true, email: true, role: true },
    });
    user = dbUser
      ? { name: dbUser.name, email: dbUser.email, role: dbUser.role }
      : { name: session.user.name ?? "Kullanıcı", email: session.user.email, role: "user" };
  }
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <AppShell user={user}>{children}</AppShell>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
