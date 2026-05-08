"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { submitNomination } from "@/lib/api/events";
import {
  createNominationImageUploadIntent,
  uploadFileToSignedUrl,
} from "@/lib/api/uploads";
import { EventCategoryResponse, EventResponse, SubmitNominationInput } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function formatDate(date: string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(minor: number, currency: string): string {
  if (minor === 0) return "Free";
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function validateGhanaPhone(value: string): string | null {
  const normalized = value.trim();
  if (!/^\d{10}$/.test(normalized)) {
    return "Enter a 10-digit phone number, e.g. 0257323294.";
  }
  if (/^(\d)\1{9}$/.test(normalized)) {
    return "Enter a real phone number, not repeated digits.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Status banners for non-open states
// ---------------------------------------------------------------------------

export function StatusBanner({ event }: { event: EventResponse }) {
  const { status } = event;

  if (status === "NOMINATIONS_OPEN") return null;

  const config: Record<
    string,
    { color: string; icon: string; title: string; body: string }
  > = {
    APPROVED: {
      color: "border-primary/18 bg-[#eef4ff] text-primary",
      icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      title: "Nominations opening soon",
      body: event.nominationStartAt
        ? `Nominations are scheduled to open on ${formatDate(event.nominationStartAt)}.`
        : "Nominations will open shortly after final approval.",
    },
    NOMINATIONS_CLOSED: {
      color: "border-[#dce4f1] bg-[#f4f6fb] text-ink/60",
      icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
      title: "Nominations have closed",
      body: "Nominations are closed for this event. Return during the voting window to support confirmed contestants.",
    },
    VOTING_SCHEDULED: {
      color: "border-primary/18 bg-[#eef4ff] text-primary",
      icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      title: "Voting is scheduled",
      body: `Voting opens on ${formatDate(event.votingStartAt)}.`,
    },
    VOTING_LIVE: {
      color: "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]",
      icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
      title: "Voting is live",
      body: `Cast your votes before ${formatDate(event.votingEndAt)}.`,
    },
    VOTING_CLOSED: {
      color: "border-[#dce4f1] bg-[#f4f6fb] text-ink/60",
      icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      title: "This event has ended",
      body: "Voting has closed. Results will be announced by the event organisers.",
    },
    VOTING_CLOSED_ARCHIVED: {
      color: "border-[#dce4f1] bg-[#f4f6fb] text-ink/60",
      icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      title: "This event has ended",
      body: "This event has been archived.",
    },
  };

  const cfg = config[status];
  if (!cfg) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-5 ${cfg.color}`}
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
      </svg>
      <div>
        <p className="font-semibold">{cfg.title}</p>
        <p className="mt-0.5 text-sm opacity-80">{cfg.body}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category picker
// ---------------------------------------------------------------------------

function CategoryOption({
  category,
  selected,
  onSelect,
}: {
  category: EventCategoryResponse;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
        selected
          ? "border-primary bg-[#eef4ff] shadow-[0_0_0_3px_rgba(15,76,219,0.12)]"
          : "border-[#dce4f1] bg-white hover:border-primary/40 hover:bg-[#f7f9ff]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{category.name}</p>
          {category.description && (
            <p className="mt-1 text-sm leading-5 text-ink/56">
              {category.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full border border-primary/18 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
            {formatCurrency(category.votePriceMinor, category.currency)}
          </span>
          <div
            className={`h-4 w-4 rounded-full border-2 ${
              selected ? "border-primary bg-primary" : "border-[#c8d4e8]"
            }`}
          >
            {selected && (
              <svg
                className="h-full w-full text-white"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M12.78 5.22a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06L7 9.94l4.72-4.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Photo upload widget
// ---------------------------------------------------------------------------

function PhotoUpload({
  eventId,
  onUploaded,
}: {
  eventId: string;
  onUploaded: (url: string, key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image must be smaller than 8 MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const intent = await createNominationImageUploadIntent({
        fileName: file.name,
        contentType: file.type,
        eventId,
      });
      await uploadFileToSignedUrl(intent.uploadUrl, file);
      onUploaded(intent.publicUrl, intent.key);
    } catch {
      setUploadError("Upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink/70">
        Nominee photo{" "}
        <span className="font-normal text-ink/38">(optional)</span>
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed transition ${
          preview
            ? "border-primary/30"
            : "border-[#d6deeb] hover:border-primary/40 hover:bg-[#f7f9ff]"
        }`}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Nominee preview"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-end bg-[linear-gradient(to_top,rgba(7,17,31,0.5),transparent)] p-3">
              <span className="text-xs font-semibold text-white">
                {uploading ? "Uploading…" : "Tap to change"}
              </span>
            </div>
          </>
        ) : (
          <>
            <svg
              className="h-8 w-8 text-ink/28"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.4}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <p className="text-sm text-ink/44">Click to upload a photo</p>
            <p className="text-xs text-ink/30">JPG, PNG or WEBP · Max 8 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {uploadError && (
        <p className="mt-1.5 text-xs font-medium text-accent">{uploadError}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink/70">
        {label}{" "}
        {required ? (
          <span className="text-accent">*</span>
        ) : (
          <span className="font-normal text-ink/36">(optional)</span>
        )}
      </label>
      {hint && <p className="mb-1.5 text-xs text-ink/42">{hint}</p>}
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-accent">{error}</p>
      )}
    </div>
  );
}

const inputClass =
  "mt-0 w-full rounded-xl border border-[#d6deeb] bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition";

// ---------------------------------------------------------------------------
// Nomination form
// ---------------------------------------------------------------------------

type FormState = {
  categoryId: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string;
  nomineeName: string;
  nomineeEmail: string;
  nomineePhone: string;
  nomineeImageUrl: string;
  nomineeImageKey: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!form.categoryId) errors.categoryId = "Please select a category.";
  if (!form.submitterName.trim()) errors.submitterName = "Your name is required.";
  if (form.submitterEmail && !emailRe.test(form.submitterEmail.trim())) {
    errors.submitterEmail = "Enter a valid email address.";
  }
  if (!form.submitterPhone.trim()) {
    errors.submitterPhone = "Your phone number is required.";
  } else {
    const phoneError = validateGhanaPhone(form.submitterPhone);
    if (phoneError) errors.submitterPhone = phoneError;
  }
  if (!form.nomineeName.trim()) errors.nomineeName = "Nominee name is required.";
  if (form.nomineeEmail && !emailRe.test(form.nomineeEmail.trim())) {
    errors.nomineeEmail = "Enter a valid email address.";
  }
  if (!form.nomineePhone.trim()) {
    errors.nomineePhone = "Nominee phone number is required.";
  } else {
    const phoneError = validateGhanaPhone(form.nomineePhone);
    if (phoneError) errors.nomineePhone = phoneError;
  }
  return errors;
}

export function NominationForm({
  event,
}: {
  event: EventResponse;
}) {
  const detailsRef = useRef<HTMLDivElement>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [form, setForm] = useState<FormState>({
    categoryId: event.categories.length === 1 ? event.categories[0]!.id : "",
    submitterName: "",
    submitterEmail: "",
    submitterPhone: "",
    nomineeName: "",
    nomineeEmail: "",
    nomineePhone: "",
    nomineeImageUrl: "",
    nomineeImageKey: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function selectCategory(categoryId: string, options: { jumpToDetails?: boolean } = {}) {
    set("categoryId", categoryId);
    setCategoryPickerOpen(false);
    setCategorySearch("");
    if (options.jumpToDetails) {
      window.setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  useEffect(() => {
    if (!categoryPickerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [categoryPickerOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const input: SubmitNominationInput = {
      categoryId: form.categoryId,
      submitterName: form.submitterName.trim(),
      submitterPhone: form.submitterPhone.trim(),
      nomineeName: form.nomineeName.trim(),
      nomineePhone: form.nomineePhone.trim(),
    };
    if (form.submitterEmail.trim()) input.submitterEmail = form.submitterEmail.trim();
    if (form.nomineeEmail.trim()) input.nomineeEmail = form.nomineeEmail.trim();
    if (form.nomineeImageUrl) {
      input.nomineeImageUrl = form.nomineeImageUrl;
      input.nomineeImageKey = form.nomineeImageKey;
    }

    try {
      await submitNomination(event.id, input);
      setSubmitted(true);
    } catch (err) {
      setServerError(
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-[1.8rem] border border-[#cfe7da] bg-[#eef9f2] px-8 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dcf5e8]">
          <svg
            className="h-7 w-7 text-[#1b6f4b]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[#1b6f4b]">
            Nomination submitted!
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#1b6f4b]/72">
            Your nomination for{" "}
            <span className="font-semibold">{form.nomineeName}</span> has been
            received. The event team will review it before it goes live.
          </p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm((prev) => ({
              ...prev,
              nomineeName: "",
              nomineeEmail: "",
              nomineePhone: "",
              nomineeImageUrl: "",
              nomineeImageKey: "",
            }));
          }}
          className="mt-2 rounded-full border border-[#b4e0c4] bg-white px-6 py-2 text-sm font-semibold text-[#1b6f4b] transition hover:bg-[#dcf5e8]"
        >
          Nominate someone else
        </button>
      </div>
    );
  }

  const selectedCategory = event.categories.find((c) => c.id === form.categoryId);
  const hasLongCategoryList = event.categories.length > 4;
  const categoryQuery = categorySearch.trim().toLowerCase();
  const mobileCategories = categoryQuery
    ? event.categories.filter((category) =>
        [category.name, category.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(categoryQuery),
      )
    : event.categories;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div className="space-y-6">
        <div className="sticky top-3 z-20 rounded-2xl border border-primary/14 bg-white/95 p-3 shadow-[0_14px_34px_-24px_rgba(7,17,31,0.38)] backdrop-blur">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink/36">
            Nomination context
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">
            {event.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                selectedCategory
                  ? "bg-primary text-white"
                  : "border border-[#d6deeb] bg-[#f8fafc] text-ink/50"
              }`}
            >
              {selectedCategory ? selectedCategory.name : "Choose a category"}
            </span>
            {selectedCategory ? (
              <button
                type="button"
                onClick={() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-full border border-primary/18 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/6"
              >
                Continue to details
              </button>
            ) : null}
          </div>
        </div>

        {/* Category */}
        <Field
          label="Which category?"
          required
          error={errors.categoryId}
        >
          {hasLongCategoryList ? (
            <p className="mt-1 hidden text-xs text-ink/42 sm:block">
              {event.categories.length} categories available. This list scrolls independently on larger screens.
            </p>
          ) : null}
          <div className="mt-2 sm:hidden">
            <button
              type="button"
              onClick={() => setCategoryPickerOpen(true)}
              className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                selectedCategory
                  ? "border-primary bg-[#eef4ff]"
                  : "border-[#d6deeb] bg-white"
              }`}
              aria-haspopup="dialog"
              aria-expanded={categoryPickerOpen}
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink/38">
                  Category
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-ink">
                  {selectedCategory ? selectedCategory.name : "Choose a nomination category"}
                </span>
              </span>
              <svg
                className="h-5 w-5 shrink-0 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {selectedCategory ? (
              <div className="mt-3 rounded-2xl border border-primary/14 bg-[#f8fbff] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{selectedCategory.name}</p>
                    {selectedCategory.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/52">
                        {selectedCategory.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/18 bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-primary/80">
                    {formatCurrency(selectedCategory.votePriceMinor, selectedCategory.currency)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          <div
            className={[
              "mt-2 hidden space-y-2.5 sm:block",
              hasLongCategoryList
                ? "max-h-[320px] overflow-y-auto pr-1 [scrollbar-width:thin]"
                : "",
            ].join(" ")}
          >
            {event.categories.map((cat) => (
              <CategoryOption
                key={cat.id}
                category={cat}
                selected={form.categoryId === cat.id}
                onSelect={() => selectCategory(cat.id)}
              />
            ))}
          </div>
        </Field>

        <div className="border-t border-[#edf0f6]" />

        {/* Submitter */}
        <div ref={detailsRef} className="scroll-mt-28">
          <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
            Your details
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" required error={errors.submitterName}>
              <input
                type="text"
                className={inputClass}
                placeholder="Jane Smith"
                value={form.submitterName}
                onChange={(e) => set("submitterName", e.target.value)}
              />
            </Field>
            <Field label="Your phone" required error={errors.submitterPhone}>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                className={inputClass}
                placeholder="0257323294"
                value={form.submitterPhone}
                onChange={(e) => set("submitterPhone", normalizePhoneInput(e.target.value))}
              />
            </Field>
            <Field
              label="Your email"
              error={errors.submitterEmail}
            >
              <input
                type="email"
                className={inputClass}
                placeholder="you@example.com"
                value={form.submitterEmail}
                onChange={(e) => set("submitterEmail", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[#edf0f6]" />

        {/* Nominee */}
        <div>
          <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
            Who are you nominating?
          </p>
          {selectedCategory && (
            <p className="mb-4 text-sm text-ink/50">
              For category:{" "}
              <span className="font-semibold text-ink/70">
                {selectedCategory.name}
              </span>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nominee name" required error={errors.nomineeName}>
              <input
                type="text"
                className={inputClass}
                placeholder="Full name"
                value={form.nomineeName}
                onChange={(e) => set("nomineeName", e.target.value)}
              />
            </Field>
            <Field label="Nominee email" error={errors.nomineeEmail}>
              <input
                type="email"
                className={inputClass}
                placeholder="nominee@example.com"
                value={form.nomineeEmail}
                onChange={(e) => set("nomineeEmail", e.target.value)}
              />
            </Field>
            <Field label="Nominee phone" required error={errors.nomineePhone}>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                className={inputClass}
                placeholder="0257323294"
                value={form.nomineePhone}
                onChange={(e) => set("nomineePhone", normalizePhoneInput(e.target.value))}
              />
            </Field>
          </div>

          <div className="mt-4">
            <PhotoUpload
              eventId={event.id}
              onUploaded={(url, key) => {
                set("nomineeImageUrl", url);
                set("nomineeImageKey", key);
              }}
            />
          </div>
        </div>

        {serverError && (
          <div className="rounded-xl border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary w-full justify-center disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit nomination"}
        </button>

        <p className="text-center text-xs text-ink/36">
          Nominations are reviewed by the event team before going live.
        </p>
      </div>

      {categoryPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/45 backdrop-blur-[2px] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Choose nomination category"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close category picker"
            onClick={() => setCategoryPickerOpen(false)}
          />
          <div className="relative max-h-[82vh] w-full overflow-hidden rounded-t-[1.5rem] bg-white shadow-[0_-24px_70px_rgba(7,17,31,0.22)]">
            <div className="border-b border-[#edf0f6] px-5 py-4">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#d6deeb]" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-ink/38">
                    {event.name}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    Choose category
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryPickerOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4f6fb] text-ink/55"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
              {event.categories.length > 6 ? (
                <div className="mt-4">
                  <input
                    type="search"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search category"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              ) : null}
            </div>

            <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
              {mobileCategories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d6deeb] bg-[#f8fafc] px-4 py-8 text-center text-sm text-ink/48">
                  No category matches that search.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mobileCategories.map((category) => {
                    const selected = form.categoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectCategory(category.id, { jumpToDetails: true })}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-primary bg-[#eef4ff] shadow-[0_0_0_3px_rgba(15,76,219,0.1)]"
                            : "border-[#dce4f1] bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{category.name}</p>
                            {category.description ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/52">
                                {category.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="rounded-full border border-primary/18 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                              {formatCurrency(category.votePriceMinor, category.currency)}
                            </span>
                            {selected ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                  <path d="M12.78 5.22a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06L7 9.94l4.72-4.72a.75.75 0 0 1 1.06 0Z" />
                                </svg>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
