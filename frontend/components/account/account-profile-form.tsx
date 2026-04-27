"use client";

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
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user?.fullName]);

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(19rem,0.65fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/70 bg-white/84 p-7 shadow-card backdrop-blur sm:p-8"
      >
        <p className="section-kicker">Account</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
          Your SwiftVote profile.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-ink/64">
          This page validates the current auth flow. It uses your live backend
          session and refresh cookie to keep the profile available.
        </p>

        <div className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink/74">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                if (fieldError) {
                  setFieldError(
                    validateFullName(event.target.value),
                  );
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

      <div className="space-y-4">
        <div className="rounded-[2rem] bg-[#07111f] p-7 text-white shadow-[0_28px_70px_rgba(4,7,14,0.18)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/46">
            Session
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-white/54">Status</p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em]">
                {user?.status ?? (isHydratingProfile ? "Loading" : "Unknown")}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/54">System role</p>
              <p className="mt-1 text-lg font-semibold text-white/88">
                {user?.systemRole ?? "NONE"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/84 p-7 shadow-card backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/42">
            Identity
          </p>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-sm font-medium text-ink/50">Email</dt>
              <dd className="mt-1 text-base font-semibold text-ink/84">
                {user?.email ?? "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink/50">User ID</dt>
              <dd className="mt-1 break-all text-sm leading-6 text-ink/70">
                {user?.id ?? "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink/50">Updated</dt>
              <dd className="mt-1 text-sm leading-6 text-ink/70">
                {user?.updatedAt
                  ? new Date(user.updatedAt).toLocaleString()
                  : "Loading..."}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
