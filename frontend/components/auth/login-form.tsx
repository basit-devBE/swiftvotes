"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import {
  validateEmail,
  validatePassword,
} from "@/lib/forms/auth-validation";
import { useAuth } from "@/hooks/use-auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = searchParams.get("next") || "/events";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(nextPath);
    }
  }, [nextPath, router, status]);

  function validateForm() {
    const nextErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };

    setFieldErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      setError("Please correct the highlighted fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.replace(nextPath);
    } catch (submissionError) {
      if (submissionError instanceof ApiClientError) {
        setError(submissionError.message || "Unable to sign in.");
      } else {
        setError("Unable to sign in.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink/74">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email) {
                setFieldErrors((current) => ({
                  ...current,
                  email: validateEmail(event.target.value) ?? undefined,
                }));
              }
            }}
            onBlur={() =>
              setFieldErrors((current) => ({
                ...current,
                email: validateEmail(email) ?? undefined,
              }))
            }
            aria-invalid={Boolean(fieldErrors.email)}
            className={`form-input ${
              fieldErrors.email ? "form-input-invalid" : ""
            }`}
            placeholder="you@example.com"
            required
          />
          {fieldErrors.email ? (
            <p className="form-error-text">{fieldErrors.email}</p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink/74">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) {
                setFieldErrors((current) => ({
                  ...current,
                  password: validatePassword(event.target.value) ?? undefined,
                }));
              }
            }}
            onBlur={() =>
              setFieldErrors((current) => ({
                ...current,
                password: validatePassword(password) ?? undefined,
              }))
            }
            aria-invalid={Boolean(fieldErrors.password)}
            className={`form-input ${
              fieldErrors.password ? "form-input-invalid" : ""
            }`}
            placeholder="Enter your password"
            required
          />
          {fieldErrors.password ? (
            <p className="form-error-text">{fieldErrors.password}</p>
          ) : null}
        </label>
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <Link
          href="/signup"
          className="text-sm font-semibold text-primary transition hover:text-primary-deep"
        >
          Need an account?
        </Link>
      </div>
    </form>
  );
}
