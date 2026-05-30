"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Baby } from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/client";

export default function HomePage() {
  const { m } = useI18n();
  const { data: session } = useSession();

  const authTarget = "/login";
  const registerTarget = "/register";

  return (
    <div className="flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Baby className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">{m.appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {session?.user ? (
              <AccountMenu />
            ) : (
              <>
                <Link href={authTarget}>
                  <Button variant="ghost" size="sm">{m.auth.login}</Button>
                </Link>
                <Link href={registerTarget}>
                  <Button size="sm">{m.auth.register}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto max-w-4xl space-y-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{m.home.headline}</h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">{m.home.description}</p>
            {session?.user ? (
              <div className="flex justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    {m.common.enterDashboard}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                <Link href={registerTarget}>
                  <Button size="lg" className="gap-2">
                    {m.home.startNow}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={authTarget}>
                  <Button size="lg" variant="outline">
                    {m.home.hasAccountLogin}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {m.home.features.map((feature) => (
                <Card key={feature.title} className="transition hover:-translate-y-0.5 hover:shadow-sm">
                  <CardHeader>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
