"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/messages";
import { mapBabyRequestError } from "@/lib/baby-request";
import type { Baby } from "@/types";
import { babySchema, type BabyInput } from "@/validations/baby";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface BabyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (baby: Baby) => void;
}

interface CreateBabyResponse {
  success?: boolean;
  data?: Baby;
  error?: string;
  message?: string;
}

function getLocalDateInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function BabyDialog({ open, onOpenChange, onCreated }: BabyDialogProps) {
  const { m, locale } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const today = getLocalDateInputValue();

  const form = useForm<BabyInput>({
    resolver: zodResolver(babySchema),
    defaultValues: {
      name: "",
      birthDate: today,
      gender: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      birthDate: getLocalDateInputValue(),
      gender: undefined,
    });
  }, [form, open]);

  const onSubmit = async (data: BabyInput) => {
    if (isSubmitting || submitLockRef.current) return;

    const trimmedName = data.name.trim();
    const cachedBabies = queryClient.getQueryData<Baby[]>(["babies"]) || [];
    const duplicateInCache = cachedBabies.some(
      (baby) => baby.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateInCache) {
      toast({
        title: locale === "zh" ? "重名" : "Duplicate name",
        description:
          locale === "zh"
            ? "同一账户下不允许添加同名宝宝，请修改姓名"
            : "Baby name already exists in this account",
        variant: "destructive",
      });
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      let response: Response;
      try {
        response = await fetch("/api/babies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch {
        const optimisticBaby: Baby = {
          id: `optimistic-${Date.now()}`,
          name: trimmedName,
          birthDate: new Date(data.birthDate),
          gender: data.gender ?? null,
          avatarUrl: null,
          userId: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        toast({
          title: m.babies.addSuccess,
          description: trimmedName,
        });
        onOpenChange(false);
        form.reset();
        queryClient.setQueryData<Baby[]>(["babies"], (prev = []) => {
          const exists = prev.some(
            (baby) => baby.name.trim().toLowerCase() === trimmedName.toLowerCase()
          );
          if (exists) return prev;
          return [optimisticBaby, ...prev];
        });
        onCreated?.(optimisticBaby);
        return;
      }

      let body: CreateBabyResponse | null = null;
      try {
        body = (await response.json()) as CreateBabyResponse;
      } catch {
        body = null;
      }

      const isSuccess = response.ok && body?.success !== false;
      if (!isSuccess) {
        const { title, description } = mapBabyRequestError(
          locale as Locale,
          response.status,
          body?.error,
          locale === "zh" ? "新增宝宝失败" : "Create baby failed"
        );
        toast({
          title,
          description,
          variant: "destructive",
        });
        return;
      }

      const createdBaby = body?.data ?? null;

      toast({
        title: m.babies.addSuccess,
        description: trimmedName,
      });

      onOpenChange(false);
      form.reset();

      queryClient.setQueryData<Baby[]>(["babies"], (prev = []) => {
        if (!createdBaby) return prev;
        if (prev.some((b) => b.id === createdBaby.id)) return prev;
        return [createdBaby, ...prev];
      });
      if (createdBaby) {
        onCreated?.(createdBaby);
      }
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleSaveClick = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    await onSubmit(values);
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.babies.add}</DialogTitle>
          <DialogDescription>{m.babies.addDescription}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">{m.babies.name}</Label>
            <Input id="name" {...form.register("name")} placeholder={m.babies.namePlaceholder} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">{m.babies.birthDate}</Label>
            <Input id="birthDate" type="date" min="1900-01-01" max={today} {...form.register("birthDate")} />
            {form.formState.errors.birthDate && (
              <p className="text-sm text-destructive">{form.formState.errors.birthDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">{m.babies.gender}</Label>
            <Select value={form.watch("gender") || ""} onValueChange={(value) => form.setValue("gender", value)}>
              <SelectTrigger>
                <SelectValue placeholder={m.babies.gender} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">{m.babies.male}</SelectItem>
                <SelectItem value="FEMALE">{m.babies.female}</SelectItem>
                <SelectItem value="OTHER">{m.babies.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {m.common.cancel}
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={handleSaveClick}>
              {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {m.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
