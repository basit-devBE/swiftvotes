"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import {
  createEvent,
  resubmitEvent,
  submitEvent,
  updateEvent,
} from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";
import {
  createEventBannerUploadIntent,
  createEventFlyerUploadIntent,
  uploadFileToSignedUrl,
} from "@/lib/api/uploads";

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

type EditableCategory = {
  name: string;
  description: string;
  votePriceMinor: string;
  currency: string;
  sortOrder: number;
};

type EventEditorProps = {
  mode: "create" | "update";
  initialEvent?: EventResponse;
};

type StepKey = "basics" | "schedule" | "media" | "categories" | "review";

const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: "basics", title: "Basic info", subtitle: "Name & description" },
  { key: "schedule", title: "Schedule", subtitle: "Voting timeline" },
  { key: "media", title: "Media", subtitle: "Flyer & banner" },
  { key: "categories", title: "Categories", subtitle: "Voting tracks" },
  { key: "review", title: "Review", subtitle: "Confirm & submit" },
];

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrUndefined(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function formatPriceLabel(value: string, currency: string): string {
  const numeric = Number.parseInt(value || "0", 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Free voting";
  return `${currency || "GHS"} ${numeric.toLocaleString()}`;
}

function formatStatusLabel(status?: string): string {
  return status?.replaceAll("_", " ") ?? "DRAFT";
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI atoms
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  "h-11 w-full rounded-lg border border-[#e1e6ef] bg-white px-3.5 text-[14px] text-[#07111f] outline-none transition placeholder:text-[#9aa4b6] focus:border-[#0f4cdb] focus:ring-4 focus:ring-[#0f4cdb]/8 disabled:cursor-not-allowed disabled:bg-[#f7f9fc] disabled:opacity-60";

const textareaCls =
  "min-h-[120px] w-full rounded-lg border border-[#e1e6ef] bg-white px-3.5 py-3 text-[14px] leading-6 text-[#07111f] outline-none transition placeholder:text-[#9aa4b6] focus:border-[#0f4cdb] focus:ring-4 focus:ring-[#0f4cdb]/8 disabled:cursor-not-allowed disabled:bg-[#f7f9fc] disabled:opacity-60";

function Field({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-[#07111f]">
          {label}
          {required && <span className="ml-1 text-[#b40f17]">*</span>}
        </label>
        {optional && (
          <span className="text-[11px] font-medium text-[#9aa4b6]">
            Optional
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[12px] text-[#9aa4b6]">{hint}</p>}
    </div>
  );
}

// Icons for step rail
function IconBasics({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
function IconSchedule({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconMedia({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
function IconCategories({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconReview({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

const stepIcons: Record<StepKey, (p: { className?: string }) => React.JSX.Element> = {
  basics: IconBasics,
  schedule: IconSchedule,
  media: IconMedia,
  categories: IconCategories,
  review: IconReview,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function EventEditor({ mode, initialEvent }: EventEditorProps) {
  const router = useRouter();
  const isUpdate = mode === "update" && initialEvent;
  const isEditable =
    !isUpdate || ["DRAFT", "REJECTED"].includes(initialEvent?.status ?? "DRAFT");

  // Form state
  const [name, setName] = useState(initialEvent?.name ?? "");
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [primaryFlyerUrl, setPrimaryFlyerUrl] = useState(initialEvent?.primaryFlyerUrl ?? "");
  const [primaryFlyerKey, setPrimaryFlyerKey] = useState(initialEvent?.primaryFlyerKey ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialEvent?.bannerUrl ?? "");
  const [bannerKey, setBannerKey] = useState(initialEvent?.bannerKey ?? "");
  const [nominationStartAt, setNominationStartAt] = useState(toDateTimeLocalValue(initialEvent?.nominationStartAt));
  const [nominationEndAt, setNominationEndAt] = useState(toDateTimeLocalValue(initialEvent?.nominationEndAt));
  const [votingStartAt, setVotingStartAt] = useState(toDateTimeLocalValue(initialEvent?.votingStartAt));
  const [votingEndAt, setVotingEndAt] = useState(toDateTimeLocalValue(initialEvent?.votingEndAt));

  const [categories, setCategories] = useState<EditableCategory[]>(
    initialEvent?.categories.length
      ? initialEvent.categories.map((c) => ({
          name: c.name,
          description: c.description,
          votePriceMinor: String(c.votePriceMinor),
          currency: c.currency,
          sortOrder: c.sortOrder,
        }))
      : [{ name: "", description: "", votePriceMinor: "0", currency: "GHS", sortOrder: 0 }],
  );

  // UI state
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const pageHeading = useMemo(() => {
    if (!isUpdate) return "Create Event";
    return initialEvent?.status === "REJECTED" ? "Revise Event" : "Manage Event";
  }, [initialEvent?.status, isUpdate]);

  const canSubmitForApproval =
    Boolean(initialEvent) &&
    ["DRAFT", "REJECTED"].includes(initialEvent?.status ?? "DRAFT") &&
    !isSaving;

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleAssetUpload(file: File, kind: "flyer" | "banner") {
    if (kind === "flyer") setIsUploadingFlyer(true);
    else setIsUploadingBanner(true);
    setError(null);

    try {
      const intent =
        kind === "flyer"
          ? await createEventFlyerUploadIntent({ fileName: file.name, contentType: file.type, eventId: initialEvent?.id })
          : await createEventBannerUploadIntent({ fileName: file.name, contentType: file.type, eventId: initialEvent?.id });

      await uploadFileToSignedUrl(intent.uploadUrl, file);

      if (kind === "flyer") {
        setPrimaryFlyerUrl(intent.publicUrl);
        setPrimaryFlyerKey(intent.key);
      } else {
        setBannerUrl(intent.publicUrl);
        setBannerKey(intent.key);
      }
    } catch (uploadError) {
      if (uploadError instanceof ApiClientError) setError(uploadError.message);
      else if (uploadError instanceof Error) setError(uploadError.message);
      else setError("Unable to upload media right now.");
    } finally {
      if (kind === "flyer") setIsUploadingFlyer(false);
      else setIsUploadingBanner(false);
    }
  }

  function updateCategoryField(index: number, field: keyof EditableCategory, value: string | number) {
    setCategories((current) =>
      current.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function addCategory() {
    setCategories((current) => [
      ...current,
      {
        name: "",
        description: "",
        votePriceMinor: "0",
        currency: current[0]?.currency ?? "GHS",
        sortOrder: current.length,
      },
    ]);
  }

  function removeCategory(index: number) {
    setCategories((current) =>
      current
        .filter((_, i) => i !== index)
        .map((c, i) => ({ ...c, sortOrder: i })),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!primaryFlyerUrl || !primaryFlyerKey) {
      setError("A primary flyer is required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name,
        description,
        primaryFlyerUrl,
        primaryFlyerKey,
        bannerUrl: bannerUrl || undefined,
        bannerKey: bannerKey || undefined,
        nominationStartAt: toIsoOrUndefined(nominationStartAt),
        nominationEndAt: toIsoOrUndefined(nominationEndAt),
        votingStartAt: new Date(votingStartAt).toISOString(),
        votingEndAt: new Date(votingEndAt).toISOString(),
        categories: categories.map((c, i) => ({
          name: c.name,
          description: c.description,
          votePriceMinor: Number.parseInt(c.votePriceMinor || "0", 10),
          currency: c.currency.trim().toUpperCase(),
          sortOrder: i,
        })),
      };

      if (isUpdate && initialEvent) {
        const updated = await updateEvent(initialEvent.id, payload);
        setSuccess("Event updated successfully.");
        router.replace(`/events/${updated.id}`);
        router.refresh();
      } else {
        const created = await createEvent(payload);
        router.replace(`/events/${created.id}`);
      }
    } catch (submissionError) {
      if (submissionError instanceof ApiClientError) setError(submissionError.message);
      else setError("Unable to save the event right now.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!initialEvent) return;
    setIsSubmittingForApproval(true);
    setError(null);
    setSuccess(null);

    try {
      const result =
        initialEvent.status === "REJECTED"
          ? await resubmitEvent(initialEvent.id)
          : await submitEvent(initialEvent.id);

      setSuccess(
        result.status === "PENDING_APPROVAL"
          ? "Event submitted for admin approval."
          : "Event updated.",
      );
      router.replace(`/events/${result.id}`);
      router.refresh();
    } catch (submissionError) {
      if (submissionError instanceof ApiClientError) setError(submissionError.message);
      else setError("Unable to submit the event for approval.");
    } finally {
      setIsSubmittingForApproval(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1200px] pb-16">
      {/* ── Title bar ── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[#0f4cdb]">
            {isUpdate ? "Event workspace" : "New event"}
          </p>
          <h1 className="mt-1.5 font-display text-[2rem] font-semibold tracking-[-0.02em] text-[#07111f] sm:text-[2.4rem]">
            {pageHeading}
          </h1>
        </div>
        {isUpdate && (
          <span className="rounded-full border border-[#e1e6ef] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#07111f]/65">
            {formatStatusLabel(initialEvent?.status)}
          </span>
        )}
      </div>

      {initialEvent?.rejectionReason && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#f1c6c8] bg-[#fff5f5] px-4 py-3 text-[13px] text-[#8f2430]">
          <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <span className="font-semibold">Rejection reason: </span>
            {initialEvent.rejectionReason}
          </div>
        </div>
      )}

      {/* ── Layout: rail | form | preview ── */}
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        {/* ── Step rail ── */}
        <nav aria-label="Form steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const Icon = stepIcons[s.key];
              const isActive = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setStepIndex(i)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive
                        ? "bg-[#0f4cdb]/8"
                        : "hover:bg-[#07111f]/3"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                        isActive
                          ? "bg-[#0f4cdb] text-white"
                          : isDone
                            ? "bg-[#0f4cdb]/12 text-[#0f4cdb]"
                            : "bg-[#f0f3f8] text-[#9aa4b6]"
                      }`}
                    >
                      {isDone ? <IconCheck /> : <Icon />}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-[13px] font-semibold leading-tight ${
                          isActive
                            ? "text-[#0f4cdb]"
                            : isDone
                              ? "text-[#07111f]"
                              : "text-[#07111f]/60"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-[#9aa4b6]">
                        {s.subtitle}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ── Form panel ── */}
        <form
          id="event-editor-form"
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl border border-[#e1e6ef] bg-white"
        >
          <div className="border-b border-[#eef1f6] px-6 py-5 sm:px-8">
            <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em] text-[#07111f]">
              {currentStep.title}
            </h2>
            <p className="mt-1 text-[13px] text-[#9aa4b6]">
              Step {stepIndex + 1} of {STEPS.length} — {currentStep.subtitle}
            </p>
          </div>

          <div className="px-6 py-7 sm:px-8">
            {/* ── Step: Basics ── */}
            {currentStep.key === "basics" && (
              <div className="space-y-5">
                <Field label="Event name" required>
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Campus Choice Awards 2026"
                    disabled={!isEditable}
                  />
                </Field>
                <Field
                  label="Description"
                  required
                  hint="Describe the purpose, audience, and how voting will work."
                >
                  <textarea
                    className={textareaCls}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell people what this event is about…"
                    disabled={!isEditable}
                  />
                </Field>
              </div>
            )}

            {/* ── Step: Schedule ── */}
            {currentStep.key === "schedule" && (
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nomination start" optional>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={nominationStartAt}
                      onChange={(e) => setNominationStartAt(e.target.value)}
                      disabled={!isEditable}
                    />
                  </Field>
                  <Field label="Nomination end" optional>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={nominationEndAt}
                      onChange={(e) => setNominationEndAt(e.target.value)}
                      disabled={!isEditable}
                    />
                  </Field>
                </div>
                <div className="h-px bg-[#eef1f6]" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Voting opens" required>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={votingStartAt}
                      onChange={(e) => setVotingStartAt(e.target.value)}
                      disabled={!isEditable}
                    />
                  </Field>
                  <Field label="Voting closes" required>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={votingEndAt}
                      onChange={(e) => setVotingEndAt(e.target.value)}
                      disabled={!isEditable}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step: Media ── */}
            {currentStep.key === "media" && (
              <div className="space-y-6">
                {/* Primary flyer */}
                <Field label="Primary flyer" required hint="Shown on the public event page. PNG, JPG, or WEBP, up to 10MB.">
                  {primaryFlyerUrl ? (
                    <div className="relative overflow-hidden rounded-lg border border-[#e1e6ef]">
                      <div className="relative h-56 w-full">
                        <Image
                          src={primaryFlyerUrl}
                          alt="Primary flyer preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 600px"
                        />
                      </div>
                      <label className="absolute right-3 top-3 cursor-pointer rounded-full bg-[#07111f]/85 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-[#07111f]">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!isEditable || isUploadingFlyer}
                          onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file) await handleAssetUpload(file, "flyer");
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e1e6ef] bg-[#fafbfd] px-6 py-10 text-center transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f4cdb]/10 text-[#0f4cdb]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <p className="text-[14px] font-medium text-[#07111f]">
                        {isUploadingFlyer ? "Uploading…" : "Click to upload flyer"}
                      </p>
                      <p className="text-[12px] text-[#9aa4b6]">PNG, JPG, WEBP up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!isEditable || isUploadingFlyer}
                        onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if (file) await handleAssetUpload(file, "flyer");
                        }}
                      />
                    </label>
                  )}
                </Field>

                {/* Banner */}
                <Field label="Banner" optional hint="Wide banner shown above event details. Recommended 1600 × 600.">
                  {bannerUrl ? (
                    <div className="relative overflow-hidden rounded-lg border border-[#e1e6ef]">
                      <div className="relative h-40 w-full">
                        <Image
                          src={bannerUrl}
                          alt="Banner preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 600px"
                        />
                      </div>
                      <label className="absolute right-3 top-3 cursor-pointer rounded-full bg-[#07111f]/85 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-[#07111f]">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!isEditable || isUploadingBanner}
                          onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file) await handleAssetUpload(file, "banner");
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e1e6ef] bg-[#fafbfd] px-6 py-8 text-center transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07111f]/6 text-[#07111f]/45">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="text-[14px] font-medium text-[#07111f]">
                        {isUploadingBanner ? "Uploading…" : "Add a banner"}
                      </p>
                      <p className="text-[12px] text-[#9aa4b6]">Recommended 1600 × 600px</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!isEditable || isUploadingBanner}
                        onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if (file) await handleAssetUpload(file, "banner");
                        }}
                      />
                    </label>
                  )}
                </Field>
              </div>
            )}

            {/* ── Step: Categories ── */}
            {currentStep.key === "categories" && (
              <div className="space-y-5">
                <p className="text-[13px] text-[#9aa4b6]">
                  Add at least one voting track. Each track has its own price.
                </p>

                <div className="space-y-3">
                  {categories.map((category, index) => (
                    <div
                      key={`${index}-${category.sortOrder}`}
                      className="overflow-hidden rounded-lg border border-[#e1e6ef]"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[#eef1f6] bg-[#fafbfd] px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0f4cdb]/10 text-[11px] font-bold text-[#0f4cdb]">
                            {index + 1}
                          </span>
                          <p className="text-[13px] font-semibold text-[#07111f]">
                            {category.name || `Category ${index + 1}`}
                          </p>
                        </div>
                        {categories.length > 1 && isEditable && (
                          <button
                            type="button"
                            onClick={() => removeCategory(index)}
                            className="text-[12px] font-semibold text-[#9aa4b6] transition hover:text-[#b40f17]"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 p-4">
                        <Field label="Name" required>
                          <input
                            className={inputCls}
                            value={category.name}
                            onChange={(e) => updateCategoryField(index, "name", e.target.value)}
                            placeholder="Best Female Personality"
                            disabled={!isEditable}
                          />
                        </Field>
                        <Field label="Description" required>
                          <textarea
                            className={textareaCls}
                            value={category.description}
                            onChange={(e) => updateCategoryField(index, "description", e.target.value)}
                            placeholder="Short context for what this category represents."
                            disabled={!isEditable}
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                          <Field label="Vote price (minor units)" required hint={formatPriceLabel(category.votePriceMinor, category.currency)}>
                            <input
                              type="number"
                              min="0"
                              className={inputCls}
                              value={category.votePriceMinor}
                              onChange={(e) => updateCategoryField(index, "votePriceMinor", e.target.value)}
                              disabled={!isEditable}
                            />
                          </Field>
                          <Field label="Currency" required>
                            <input
                              className={`${inputCls} uppercase`}
                              value={category.currency}
                              onChange={(e) => updateCategoryField(index, "currency", e.target.value)}
                              placeholder="GHS"
                              disabled={!isEditable}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {isEditable && (
                  <button
                    type="button"
                    onClick={addCategory}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#d6deeb] bg-[#fafbfd] px-4 py-3 text-[13px] font-semibold text-[#0f4cdb] transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add another category
                  </button>
                )}
              </div>
            )}

            {/* ── Step: Review ── */}
            {currentStep.key === "review" && (
              <div className="space-y-4">
                <ReviewRow label="Event name" value={name || "—"} />
                <ReviewRow label="Description" value={description || "—"} />
                <ReviewRow
                  label="Nominations"
                  value={
                    nominationStartAt && nominationEndAt
                      ? `${new Date(nominationStartAt).toLocaleString()} → ${new Date(nominationEndAt).toLocaleString()}`
                      : "Not set"
                  }
                />
                <ReviewRow
                  label="Voting"
                  value={
                    votingStartAt && votingEndAt
                      ? `${new Date(votingStartAt).toLocaleString()} → ${new Date(votingEndAt).toLocaleString()}`
                      : "—"
                  }
                />
                <ReviewRow label="Primary flyer" value={primaryFlyerUrl ? "Uploaded" : "Missing"} valueTone={primaryFlyerUrl ? "default" : "warn"} />
                <ReviewRow label="Banner" value={bannerUrl ? "Uploaded" : "Not set"} />
                <div className="rounded-lg border border-[#eef1f6] bg-[#fafbfd] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9aa4b6]">
                    Categories ({categories.length})
                  </p>
                  <ul className="mt-3 space-y-2">
                    {categories.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate text-[#07111f]">
                          {c.name || `Category ${i + 1}`}
                        </span>
                        <span className="shrink-0 rounded-full bg-[#0f4cdb]/8 px-2 py-0.5 text-[11px] font-semibold text-[#0f4cdb]">
                          {formatPriceLabel(c.votePriceMinor, c.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Inline alerts */}
            {error && (
              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-[#f1c6c8] bg-[#fff5f5] px-3.5 py-2.5 text-[13px] font-medium text-[#8f2430]">
                <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {success && (
              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-[#bfe4d2] bg-[#f2fbf6] px-3.5 py-2.5 text-[13px] font-medium text-[#1b6f4b]">
                <IconCheck className="mt-0.5 shrink-0" />
                {success}
              </div>
            )}
          </div>

          {/* ── Footer / nav ── */}
          <div className="flex items-center justify-between gap-3 border-t border-[#eef1f6] bg-[#fafbfd] px-6 py-3.5 sm:px-8">
            <button
              type="button"
              onClick={() => setStepIndex((s) => Math.max(s - 1, 0))}
              disabled={isFirstStep}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1e6ef] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#07111f] transition hover:border-[#07111f]/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back
            </button>

            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setStepIndex((s) => Math.min(s + 1, STEPS.length - 1))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f4cdb] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0a3aa8]"
              >
                Continue
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {canSubmitForApproval && (
                  <button
                    type="button"
                    onClick={() => void handleSubmitForApproval()}
                    disabled={isSubmittingForApproval}
                    className="inline-flex items-center justify-center rounded-lg bg-[#b40f17] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#960d14] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingForApproval
                      ? "Submitting…"
                      : initialEvent?.status === "REJECTED"
                        ? "Resubmit"
                        : "Submit for approval"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!isEditable || isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0f4cdb] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0a3aa8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : isUpdate ? "Save changes" : "Create event"}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* ── Live preview card ── */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-[#e1e6ef] bg-white">
            <div className="border-b border-[#eef1f6] bg-[#fafbfd] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa4b6]">
                Card preview
              </p>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-lg border border-[#eef1f6] bg-[#fafbfd]">
                <div className="relative aspect-[4/5] w-full">
                  {primaryFlyerUrl ? (
                    <Image
                      src={primaryFlyerUrl}
                      alt="Event flyer preview"
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07111f]/5 text-[#9aa4b6]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="text-[12px] text-[#9aa4b6]">No cover image</p>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="mt-3.5 truncate font-display text-[1.15rem] font-semibold tracking-[-0.01em] text-[#07111f]">
                {name || "Your event name"}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#9aa4b6]">
                {description || "A short summary will appear here."}
              </p>

              <div className="mt-3.5 space-y-2 border-t border-[#eef1f6] pt-3.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#9aa4b6]">Categories</span>
                  <span className="font-semibold text-[#07111f]">{categories.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9aa4b6]">Voting</span>
                  <span className="font-semibold text-[#07111f]">
                    {votingStartAt
                      ? new Date(votingStartAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny review row sub-component
// ─────────────────────────────────────────────────────────────────────────────

function ReviewRow({
  label,
  value,
  valueTone = "default",
}: {
  label: string;
  value: string;
  valueTone?: "default" | "warn";
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#eef1f6] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[13px] font-medium text-[#9aa4b6]">{label}</span>
      <span
        className={`max-w-[60%] text-right text-[13px] ${
          valueTone === "warn" ? "font-semibold text-[#b40f17]" : "text-[#07111f]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
