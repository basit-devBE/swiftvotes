"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/forms/auth-validation";
import { registerUser } from "@/lib/api/users";

export function SignupForm() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/events");
    }
  }, [router, status]);

  function validateForm() {
    const nextErrors = {
      fullName: validateFullName(fullName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirmPassword:
        validatePasswordConfirmation(password, confirmPassword) ?? undefined,
    };

    setFieldErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
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
      await registerUser({
        email,
        fullName,
        password,
      });
      await login({ email, password });
      router.replace("/events");
    } catch (submissionError) {
      if (submissionError instanceof ApiClientError) {
        setError(submissionError.message || "Unable to create account.");
      } else {
        setError("Unable to create account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink/74">Full name</span>
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              if (fieldErrors.fullName) {
                setFieldErrors((current) => ({
                  ...current,
                  fullName:
                    validateFullName(event.target.value) ?? undefined,
                }));
              }
            }}
            onBlur={() =>
              setFieldErrors((current) => ({
                ...current,
                fullName: validateFullName(fullName) ?? undefined,
              }))
            }
            aria-invalid={Boolean(fieldErrors.fullName)}
            className={`form-input ${
              fieldErrors.fullName ? "form-input-invalid" : ""
            }`}
            placeholder="Swift Vote"
            required
          />
          {fieldErrors.fullName ? (
            <p className="form-error-text">{fieldErrors.fullName}</p>
          ) : null}
        </label>

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
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              const nextPassword = event.target.value;
              setPassword(nextPassword);
              setFieldErrors((current) => ({
                ...current,
                password: current.password
                  ? validatePassword(nextPassword) ?? undefined
                  : current.password,
                confirmPassword: current.confirmPassword
                  ? validatePasswordConfirmation(
                      nextPassword,
                      confirmPassword,
                    ) ?? undefined
                  : current.confirmPassword,
              }));
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
            placeholder="Create a password"
            minLength={8}
            required
          />
          {fieldErrors.password ? (
            <p className="form-error-text">{fieldErrors.password}</p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink/74">
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((current) => ({
                  ...current,
                  confirmPassword:
                    validatePasswordConfirmation(
                      password,
                      event.target.value,
                    ) ?? undefined,
                }));
              }
            }}
            onBlur={() =>
              setFieldErrors((current) => ({
                ...current,
                confirmPassword:
                  validatePasswordConfirmation(
                    password,
                    confirmPassword,
                  ) ?? undefined,
              }))
            }
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            className={`form-input ${
              fieldErrors.confirmPassword ? "form-input-invalid" : ""
            }`}
            placeholder="Repeat your password"
            minLength={8}
            required
          />
          {fieldErrors.confirmPassword ? (
            <p className="form-error-text">{fieldErrors.confirmPassword}</p>
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
        <Link
          href="/login"
          className="text-sm font-semibold text-primary transition hover:text-primary-deep"
        >
          Already have an account?
        </Link>
      </div>
    </form>
  );
}
