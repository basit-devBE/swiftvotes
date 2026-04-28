"use client";

import { useEffect, useState } from "react";

import { UsersTable } from "@/components/admin/users-table";
import { listUsers } from "@/lib/api/users";
import { UserResponse } from "@/lib/api/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listUsers()
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load users.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8 border-b border-line pb-8">
        <p className="section-kicker">Users</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          User management
        </h1>
        {!isLoading && (
          <p className="mt-1.5 text-sm text-ink/50">
            {users.length} total · {activeCount} active
            {suspendedCount > 0 ? ` · ${suspendedCount} suspended` : ""}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink/40">Loading users…</p>
      ) : (
        <UsersTable initialUsers={users} />
      )}
    </div>
  );
}
