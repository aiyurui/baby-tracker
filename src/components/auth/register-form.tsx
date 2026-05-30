"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import { apiRequest } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/validations/auth";

export function RegisterForm() {
  const { m } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    const result = await apiRequest("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }, m.auth.serverError);

    if (!result.ok) {
      toast({
        title: m.auth.registerFailed,
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: m.auth.registerSuccess,
      description: m.auth.redirectingToLogin,
    });
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">{m.auth.name}</Label>
        <Input id="username" type="text" placeholder="alex" autoComplete="username" {...register("username")} />
        {errors.username && (
          <p className="text-sm text-destructive">{String(errors.username.message)}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{m.auth.email}</Label>
        <Input id="email" type="email" placeholder="your@email.com" autoComplete="email" {...register("email")} />
        {errors.email && (
          <p className="text-sm text-destructive">{String(errors.email.message)}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{m.auth.password}</Label>
        <Input id="password" type="password" placeholder="........" autoComplete="new-password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{String(errors.password.message)}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? m.auth.registerInProgress : m.auth.register}
      </Button>
    </form>
  );
}
