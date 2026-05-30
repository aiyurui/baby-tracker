"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, Baby, Settings, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AccountMenu } from "@/components/layout/account-menu";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import { ROLE, isAdminLike, isSuperAdmin } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

interface AdminContentProps {
  currentUser: {
    id: string;
    role: string;
  };
  stats: {
    totalUsers: number;
    totalBabies: number;
    totalRecords: number;
    todayRecords: number;
  };
  userGrowth: { date: string; count: number }[];
  recordGrowth: { date: string; count: number }[];
  recordTypeStats: { type: string; value: number }[];
  topUsers: {
    userId: string;
    email: string;
    name: string;
    recordCount: number;
    activityPerDay: number;
  }[];
  topBabies: {
    babyId: string;
    name: string;
    userName: string;
    recordCount: number;
    activityPerDay: number;
  }[];
  users: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    babiesCount: number;
  }[];
}

export function AdminContent({
  currentUser,
  stats,
  userGrowth,
  recordGrowth,
  recordTypeStats,
  topUsers,
  topBabies,
  users,
}: AdminContentProps) {
  const { locale, m } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [usersState, setUsersState] = useState(users);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "ADMIN" | "SUPER_ADMIN">("ALL");
  const [keyword, setKeyword] = useState("");
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const canManageRoles = isSuperAdmin(currentUser.role);
  const canDeleteUsers = isAdminLike(currentUser.role);
  const chartTypeStats = recordTypeStats.map((item) => ({
    name: m.recordType[item.type as keyof typeof m.recordType] || item.type,
    value: item.value,
    color:
      item.type === "FEEDING"
        ? "#3b82f6"
        : item.type === "SLEEP"
          ? "#6366f1"
          : item.type === "DIAPER"
            ? "#22c55e"
            : item.type === "BATH"
              ? "#06b6d4"
              : item.type === "MEDICAL"
                ? "#f59e0b"
                : "#94a3b8",
  }));
  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  };

  const roleLabel = (role: string) => {
    if (role === ROLE.SUPER_ADMIN) return locale === "zh" ? "超级管理员" : "Super Admin";
    if (role === ROLE.ADMIN) return m.admin.admin;
    return m.admin.user;
  };

  const roleBadgeClass = (role: string) => {
    if (role === ROLE.SUPER_ADMIN) return "rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700";
    if (role === ROLE.ADMIN) return "rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700";
    return "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700";
  };

  const visibleUsers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return usersState.filter((user) => {
      const roleMatch = roleFilter === "ALL" || user.role === roleFilter;
      const keywordMatch =
        !q ||
        user.email.toLowerCase().includes(q) ||
        (user.name || "").toLowerCase().includes(q);
      return roleMatch && keywordMatch;
    });
  }, [keyword, roleFilter, usersState]);

  const usersSummary = useMemo(() => {
    return {
      superAdmins: usersState.filter((user) => user.role === ROLE.SUPER_ADMIN).length,
      admins: usersState.filter((user) => user.role === ROLE.ADMIN).length,
      normalUsers: usersState.filter((user) => user.role === ROLE.USER).length,
    };
  }, [usersState]);

  const onSetRole = async (userId: string, nextRole: "USER" | "ADMIN") => {
    setRoleLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: { role?: string } };
      if (!res.ok || json.success === false) {
        toast({ title: json.error || m.common.internalError, variant: "destructive" });
        return;
      }
      setUsersState((prev) => prev.map((user) => (user.id === userId ? { ...user, role: json.data?.role || nextRole } : user)));
      toast({ title: locale === "zh" ? "角色已更新" : "Role updated" });
    } catch {
      toast({ title: m.common.internalError, variant: "destructive" });
    } finally {
      setRoleLoadingId(null);
    }
  };

  const onDeleteUser = async (userId: string, name: string | null) => {
    const confirmed = window.confirm(
      locale === "zh"
        ? `确认删除该用户？\n${name || userId}`
        : `Delete this user?\n${name || userId}`
    );
    if (!confirmed) return;

    setDeleteLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({ title: json.error || m.common.internalError, variant: "destructive" });
        return;
      }
      setUsersState((prev) => prev.filter((user) => user.id !== userId));
      toast({ title: locale === "zh" ? "用户已删除" : "User deleted" });
    } catch {
      toast({ title: m.common.internalError, variant: "destructive" });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="min-h-full pb-mobile-nav md:pb-6">
      <header className="relative border-b bg-background">
        <div className="absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 sm:block">
          <div>
            <GlobalShortcuts />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <button type="button" className="rounded-full p-2 hover:bg-muted" aria-label="back" onClick={handleGoBack}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Settings className="h-6 w-6" />
              <h1 className="text-2xl font-bold">{m.admin.title}</h1>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <div className="sm:hidden">
                <GlobalShortcuts />
              </div>
              <LanguageSwitcher />
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title={m.admin.totalUsers} value={stats.totalUsers} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title={m.admin.totalBabies} value={stats.totalBabies} icon={<Baby className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title={m.admin.totalRecords} value={stats.totalRecords} icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
          <StatCard title={m.admin.todayRecords} value={stats.todayRecords} icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title={locale === "zh" ? "超级管理员" : "Super Admins"} value={usersSummary.superAdmins} icon={<Settings className="h-4 w-4 text-purple-700" />} />
          <StatCard title={locale === "zh" ? "管理员人数" : "Admins"} value={usersSummary.admins} icon={<Users className="h-4 w-4 text-blue-700" />} />
          <StatCard title={locale === "zh" ? "普通用户人数" : "Users"} value={usersSummary.normalUsers} icon={<Users className="h-4 w-4 text-gray-700" />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={m.admin.userGrowth}>
            <ResponsiveContainer>
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={m.admin.recordGrowth}>
            <ResponsiveContainer>
              <BarChart data={recordGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title={m.admin.recordTypeStats}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={chartTypeStats} dataKey="value" nameKey="name" outerRadius={120} label>
                {chartTypeStats.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{m.admin.topUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{m.common.noData}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">{m.admin.name}</th>
                        <th className="p-2 text-left">{m.admin.email}</th>
                        <th className="p-2 text-left">{m.admin.recordCount}</th>
                        <th className="p-2 text-left">{m.admin.activityPerDay}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((user) => (
                        <tr key={user.userId} className="border-b">
                          <td className="p-2">{user.name}</td>
                          <td className="p-2">{user.email}</td>
                          <td className="p-2">{user.recordCount}</td>
                          <td className="p-2">{user.activityPerDay}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{m.admin.topBabies}</CardTitle>
            </CardHeader>
            <CardContent>
              {topBabies.length === 0 ? (
                <p className="text-sm text-muted-foreground">{m.common.noData}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">{m.babies.name}</th>
                        <th className="p-2 text-left">{m.admin.name}</th>
                        <th className="p-2 text-left">{m.admin.recordCount}</th>
                        <th className="p-2 text-left">{m.admin.activityPerDay}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBabies.map((baby) => (
                        <tr key={baby.babyId} className="border-b">
                          <td className="p-2">{baby.name}</td>
                          <td className="p-2">{baby.userName}</td>
                          <td className="p-2">{baby.recordCount}</td>
                          <td className="p-2">{baby.activityPerDay}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{m.admin.userList}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={locale === "zh" ? "搜索邮箱/姓名" : "Search by email/name"}
                className="sm:max-w-xs"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "ALL" | "USER" | "ADMIN" | "SUPER_ADMIN")}
                className="h-10 rounded-md border bg-background px-3 text-sm sm:w-44"
              >
                <option value="ALL">{locale === "zh" ? "全部角色" : "All roles"}</option>
                <option value="SUPER_ADMIN">{locale === "zh" ? "超级管理员" : "Super Admin"}</option>
                <option value="ADMIN">{locale === "zh" ? "管理员" : "Admin"}</option>
                <option value="USER">{locale === "zh" ? "普通用户" : "User"}</option>
              </select>
              <div className="text-sm text-muted-foreground">
              {locale === "zh" ? `共 ${visibleUsers.length} 人` : `${visibleUsers.length} users`}
              </div>
            </div>

            {visibleUsers.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{m.admin.noUsers}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">{m.admin.email}</th>
                      <th className="p-2 text-left">{m.admin.name}</th>
                      <th className="p-2 text-left">{m.admin.babiesCount}</th>
                      <th className="p-2 text-left">{m.admin.role}</th>
                      <th className="p-2 text-left">{m.admin.registerTime}</th>
                  <th className="p-2 text-left">{locale === "zh" ? "操作" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="p-2">{user.email}</td>
                        <td className="p-2">{user.name || "-"}</td>
                        <td className="p-2">{user.babiesCount}</td>
                        <td className="p-2">
                          <span className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</span>
                        </td>
                        <td className="p-2">{formatDate(user.createdAt, locale)}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {canManageRoles && user.id !== currentUser.id && user.role !== ROLE.SUPER_ADMIN && (
                              user.role === ROLE.ADMIN ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={roleLoadingId === user.id}
                                  onClick={() => onSetRole(user.id, ROLE.USER)}
                                >
                              {locale === "zh" ? "取消管理员" : "Demote"}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={roleLoadingId === user.id}
                                  onClick={() => onSetRole(user.id, ROLE.ADMIN)}
                                >
                              {locale === "zh" ? "设为管理员" : "Promote"}
                                </Button>
                              )
                            )}
                            {canDeleteUsers && user.id !== currentUser.id && user.role !== ROLE.SUPER_ADMIN && (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={
                                  deleteLoadingId === user.id ||
                                  (user.role === ROLE.ADMIN && !isSuperAdmin(currentUser.role))
                                }
                                onClick={() => onDeleteUser(user.id, user.name)}
                              >
                          {locale === "zh" ? "删除用户" : "Delete"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">{children}</div>
      </CardContent>
    </Card>
  );
}

