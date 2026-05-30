"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

interface EditBabyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baby: Baby | null;
  onSaved?: () => void;
}

function toDateInputValue(value: Date | string): string {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function EditBabyDialog({ open, onOpenChange, baby, onSaved }: EditBabyDialogProps) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const today = new Date().toISOString().slice(0, 10);

  const title = locale === "zh" ? "编辑宝宝信息" : "Edit Baby";
  const desc = locale === "zh" ? "修改名字、出生日期和性别" : "Update name, birth date and gender";
  const saveText = locale === "zh" ? "保存修改" : "Save Changes";
  const savedText = locale === "zh" ? "宝宝信息已更新" : "Baby profile updated";
  const failedText = locale === "zh" ? "保存失败" : "Save failed";
  const birthDateConfirmText =
    locale === "zh"
      ? "修改出生日期会影响接种预计时间，确认继续吗？"
      : "Changing birth date will affect vaccine schedule. Continue?";

  const defaultValues = useMemo<BabyInput>(
    () => ({
      name: baby?.name ?? "",
      birthDate: baby ? toDateInputValue(baby.birthDate) : "",
      gender: baby?.gender ?? undefined,
    }),
    [baby]
  );

  const form = useForm<BabyInput>({
    resolver: zodResolver(babySchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = async (data: BabyInput) => {
    if (!baby) return;

    const oldBirthDate = toDateInputValue(baby.birthDate);
    if (data.birthDate !== oldBirthDate && !window.confirm(birthDateConfirmText)) {
      return;
    }

    if (isSubmitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    let response: Response | null = null;
    let responseError = "";

    try {
      response = await fetch(`/api/babies/${baby.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        try {
          const body = (await response.json()) as { error?: string };
          responseError = body.error || "";
        } catch {
          responseError = "";
        }
      }
    } catch {
      toast({
        title: failedText,
        description: locale === "zh" ? "网络异常，请重试" : "Network error, please retry",
        variant: "destructive",
      });
      setIsSubmitting(false);
      submitLockRef.current = false;
      return;
    }

    if (!response || !response.ok) {
      const mapped = mapBabyRequestError(locale as Locale, response?.status || 0, responseError, failedText);
      toast({
        title: mapped.title,
        description: mapped.description,
        variant: "destructive",
      });
      setIsSubmitting(false);
      submitLockRef.current = false;
      return;
    }

    toast({ title: savedText, description: data.name });
    onOpenChange(false);
    queryClient.setQueryData<Baby[]>(["babies"], (prev = []) =>
      prev.map((b) =>
        b.id === baby.id
          ? {
              ...b,
              name: data.name,
              birthDate: new Date(data.birthDate),
              gender: data.gender ?? null,
            }
          : b
      )
    );
    onSaved?.();
    setIsSubmitting(false);
    submitLockRef.current = false;
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-baby-name">{locale === "zh" ? "姓名" : "Name"}</Label>
            <Input id="edit-baby-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-baby-birth-date">{locale === "zh" ? "出生日期" : "Birth date"}</Label>
            <Input
              id="edit-baby-birth-date"
              type="date"
              min="1900-01-01"
              max={today}
              {...form.register("birthDate")}
            />
            {form.formState.errors.birthDate && (
              <p className="text-sm text-destructive">{form.formState.errors.birthDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-baby-gender">{locale === "zh" ? "性别" : "Gender"}</Label>
            <Select value={form.watch("gender") || ""} onValueChange={(value) => form.setValue("gender", value)}>
              <SelectTrigger id="edit-baby-gender">
                <SelectValue placeholder={locale === "zh" ? "性别" : "Gender"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">{locale === "zh" ? "男" : "Male"}</SelectItem>
                <SelectItem value="FEMALE">{locale === "zh" ? "女" : "Female"}</SelectItem>
                <SelectItem value="OTHER">{locale === "zh" ? "保密" : "Other"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {locale === "zh" ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting || !baby}>
              {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {saveText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
