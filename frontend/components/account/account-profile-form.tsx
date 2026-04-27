"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import { validateFullName } from "@/lib/forms/auth-validation";
import { getCurrentUser, updateCurrentUser } from "@/lib/api/users";

export function AccountProfileForm() {
  const { user, setUser, logout, status } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydratingProfile, setIsHydratingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateProfile() {
      if (status !== "authenticated" || user) {
        return;
      }

      setIsHydratingProfile(true);

      try {
        const currentUser = await getCurrentUser();

        if (!cancelled) {
          setUser(currentUser);
          setFullName(currentUser.fullName);
        }
      } catch (profileError) {
        if (!cancelled) {
          if (profileError instanceof ApiClientError) {
            setError(profileError.message || "Unable to load your profile.");
          } else {
            setError("Unable to load your profile.");
          }
        }
      } finally {
        if (!cancelled) {
          setIsHydratingProfile(false);
        }
      }
    }

    void hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [setUser, status, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateFullName(fullName);

    if (validationError) {
      setFieldError(validationError);
      setError("Please correct the highlighted field.");
      setSuccess(null);
      return;
    }

    setFieldError(null);
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updatedUser = await updateCurrentUser({ fullName });
      setUser(updatedUser);
      setFullName(updatedUser.fullName);
      setSuccess("Profile updated successfully.");
    } catch (submissionError) {
      if (submissionError instanceof ApiClientError) {
        setError(submissionError.message || "Unable to update profile.");
      } else {
        setError("Unable to update profile.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-primary/12 pb-10">
        <p className="section-kicker">Account</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl lg:text-[4.2rem]">
              Your SwiftVote profile.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/62 sm:text-lg">
              Keep your core account details current while the backend handles
              session restoration through your refresh cookie.
            </p>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:min-w-[19rem] lg:gap-8">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-primary/72">
                Status
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                {user?.status ?? (isHydratingProfile ? "Loading" : "Unknown")}
              </p>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-primary/72">
                System role
              </p>
              <p className="mt-3 text-base font-semibold text-ink/82">
                {user?.systemRole ?? "NONE"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-12 pt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.7fr)] lg:gap-16">
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/42">
              Profile
            </p>
            <div className="mt-6 space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink/74">Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    if (fieldError) {
                      setFieldError(validateFullName(event.target.value));
                    }
                  }}
                  onBlur={() => setFieldError(validateFullName(fullName))}
                  aria-invalid={Boolean(fieldError)}
                  className={`form-input ${
                    fieldError ? "form-input-invalid" : ""
                  }`}
                  placeholder="Your name"
                  required
                />
                {fieldError ? (
                  <p className="form-error-text">{fieldError}</p>
                ) : null}
              </label>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-[1.25rem] border border-primary/14 bg-primary/5 px-4 py-3 text-sm font-medium text-primary-deep">
              {success}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button type="submit" className="button-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            <Link href="/events" className="button-secondary">
              My events
            </Link>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                void logout();
              }}
            >
              Logout
            </button>
          </div>
        </form>

        <aside className="border-t border-primary/12 pt-1 lg:border-l lg:border-t-0 lg:pl-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/42">
            Identity
          </p>
          <dl className="mt-6 space-y-8">
            <div>
              <dt className="text-sm font-medium text-ink/48">Email</dt>
              <dd className="mt-2 text-base font-semibold text-ink/82">
                {user?.email ?? "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink/48">User ID</dt>
              <dd className="mt-2 break-all text-sm leading-6 text-ink/64">
                {user?.id ?? "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink/48">Updated</dt>
              <dd className="mt-2 text-sm leading-6 text-ink/64">
                {user?.updatedAt
                  ? new Date(user.updatedAt).toLocaleString()
                  : "Loading..."}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
