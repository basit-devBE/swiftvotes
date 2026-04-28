"use client";

import { useState } from "react";

import { changeUserStatus } from "@/lib/api/users";
import { UserResponse } from "@/lib/api/types";

export function UsersTable({
  initialUsers,
}: {
  initialUsers: UserResponse[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleStatus(user: UserResponse) {
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setTogglingId(user.id);

    try {
      const updated = await changeUserStatus(user.id, nextStatus);
      setUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u)),
      );
    } finally {
      setTogglingId(null);
    }
  }

  if (users.length === 0) {
    return <p className="mt-10 text-sm text-ink/45">No users found.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">
            <th className="px-5 py-3.5">User</th>
            <th className="px-5 py-3.5">Role</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5">Joined</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-primary/3">
              <td className="px-5 py-4">
                <p className="font-medium text-ink">{user.fullName}</p>
                <p className="mt-0.5 text-xs text-ink/45">{user.email}</p>
              </td>
              <td className="px-5 py-4">
                {user.systemRole === "SUPER_ADMIN" ? (
                  <span className="inline-block rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Super Admin
                  </span>
                ) : (
                  <span className="text-ink/45">User</span>
                )}
              </td>
              <td className="px-5 py-4">
                <span
                  className={[
                    "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    user.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200",
                  ].join(" ")}
                >
                  {user.status === "ACTIVE" ? "Active" : "Suspended"}
                </span>
              </td>
              <td className="px-5 py-4 text-ink/55">
                {new Date(user.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="px-5 py-4 text-right">
                {user.systemRole !== "SUPER_ADMIN" && (
                  <button
                    type="button"
                    disabled={togglingId === user.id}
                    onClick={() => void handleToggleStatus(user)}
                    className={[
                      "rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                      user.status === "ACTIVE"
                        ? "border border-accent/25 text-accent hover:bg-accent/8"
                        : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50",
                    ].join(" ")}
                  >
                    {togglingId === user.id
                      ? "Saving…"
                      : user.status === "ACTIVE"
                        ? "Suspend"
                        : "Reactivate"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
