"use client";

import Link from "next/link";
import { Baby } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/client";

export default function RegisterPage() {
  const { m } = useI18n();

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-end gap-2">
          <GlobalShortcuts />
          <LanguageSwitcher />
        </div>

        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <Baby className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{m.appName}</h1>
          <p className="text-muted-foreground">{m.slogan}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">{m.auth.register}</CardTitle>
            <CardDescription>{m.auth.registerTitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {m.auth.hasAccount}{" "}
              <Link href="/login" className="text-primary hover:underline">
                {m.auth.login}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
