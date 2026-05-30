"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/validations/auth";

export function LoginForm() {
  const { m } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      account: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const result = await signIn("credentials", {
        account: data.account,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: m.auth.loginFailed,
          description: m.auth.invalidCreds,
          variant: "destructive",
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({
        title: m.auth.loginFailed,
        description: m.auth.serverError,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account">{m.auth.account}</Label>
        <Input
          id="account"
          type="text"
          placeholder="username / your@email.com"
          autoComplete="username"
          {...register("account")}
        />
        {errors.account && (
          <p className="text-sm text-destructive">{String(errors.account.message)}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{m.auth.password}</Label>
        <Input
          id="password"
          type="password"
          placeholder="........"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{String(errors.password.message)}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? m.auth.loginInProgress : m.auth.login}
      </Button>
    </form>
  );
}
