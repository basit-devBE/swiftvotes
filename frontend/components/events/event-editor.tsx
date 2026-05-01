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

const STEPS: { key: StepKey; title: string; subtitle: string; description: string }[] = [
  {
    key: "basics",
    title: "Basic info",
    subtitle: "Name & description",
    description: "Set the identity of the event people will see first.",
  },
  {
    key: "schedule",
    title: "Schedule",
    subtitle: "Voting timeline",
    description: "Define when nominations and voting become available.",
  },
  {
    key: "media",
    title: "Media",
    subtitle: "Flyer & banner",
    description: "Upload the visuals that will carry the event publicly.",
  },
  {
    key: "categories",
    title: "Categories",
    subtitle: "Voting tracks",
    description: "Structure the ballot into clear categories and prices.",
  },
  {
    key: "review",
    title: "Review",
    subtitle: "Confirm & submit",
    description: "Check readiness, save the draft, and send for approval.",
  },
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

function formatPreviewDate(value: string): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCurrentDateTimeLocalValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toValidDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI atoms
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  "h-12 w-full rounded-2xl border border-[#dfe7f3] bg-[#fbfcff] px-4 text-[14px] text-[#07111f] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition placeholder:text-[#9aa4b6] focus:border-[#0f4cdb] focus:bg-white focus:ring-4 focus:ring-[#0f4cdb]/10 disabled:cursor-not-allowed disabled:bg-[#f7f9fc] disabled:opacity-60";

const textareaCls =
  "min-h-[132px] w-full rounded-2xl border border-[#dfe7f3] bg-[#fbfcff] px-4 py-3.5 text-[14px] leading-6 text-[#07111f] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition placeholder:text-[#9aa4b6] focus:border-[#0f4cdb] focus:bg-white focus:ring-4 focus:ring-[#0f4cdb]/10 disabled:cursor-not-allowed disabled:bg-[#f7f9fc] disabled:opacity-60";

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
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#07111f]/74">
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
  const [contestantsCanViewOwnVotes, setContestantsCanViewOwnVotes] = useState(
    initialEvent?.contestantsCanViewOwnVotes ?? false,
  );
  const [contestantsCanViewLeaderboard, setContestantsCanViewLeaderboard] = useState(
    initialEvent?.contestantsCanViewLeaderboard ?? false,
  );

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
  const [savedDraft, setSavedDraft] = useState<EventResponse | null>(null);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;
  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100;
  const CurrentStepIcon = stepIcons[currentStep.key];
  const minVotingDateTime = getCurrentDateTimeLocalValue();

  const pageHeading = useMemo(() => {
    if (!isUpdate) return "Create Event";
    return initialEvent?.status === "REJECTED" ? "Revise Event" : "Manage Event";
  }, [initialEvent?.status, isUpdate]);

  const effectiveEvent = savedDraft ?? initialEvent ?? null;
  const canSubmitForApproval =
    Boolean(effectiveEvent) &&
    ["DRAFT", "REJECTED"].includes(effectiveEvent?.status ?? "DRAFT") &&
    !isSaving;

  const completedStepCount = useMemo(() => {
    let count = 0;
    if (name.trim() && description.trim()) count += 1;
    if (votingStartAt && votingEndAt) count += 1;
    if (primaryFlyerUrl && primaryFlyerKey) count += 1;
    if (
      categories.length > 0 &&
      categories.every((category) => category.name.trim() && category.description.trim())
    ) {
      count += 1;
    }
    if (
      name.trim() &&
      description.trim() &&
      votingStartAt &&
      votingEndAt &&
      primaryFlyerUrl &&
      primaryFlyerKey &&
      categories.length > 0
    ) {
      count += 1;
    }
    return count;
  }, [categories, description, name, primaryFlyerKey, primaryFlyerUrl, votingEndAt, votingStartAt]);

  const previewChecks = [
    { label: "Event identity", done: Boolean(name.trim() && description.trim()) },
    { label: "Voting schedule", done: Boolean(votingStartAt && votingEndAt) },
    { label: "Primary flyer", done: Boolean(primaryFlyerUrl && primaryFlyerKey) },
    {
      label: "At least one category",
      done: categories.length > 0 && categories.some((category) => category.name.trim()),
    },
  ];

  const categoryPreview = categories
    .map((category, index) => category.name.trim() || `Category ${index + 1}`)
    .slice(0, 3);

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

    const votingStartDate = toValidDate(votingStartAt);
    const votingEndDate = toValidDate(votingEndAt);
    const now = new Date();

    if (!votingStartDate || !votingEndDate) {
      setError("Voting open and close dates are required.");
      return;
    }

    if (votingStartDate < now) {
      setError("Voting open date cannot be in the past.");
      return;
    }

    if (votingEndDate < now) {
      setError("Voting close date cannot be in the past.");
      return;
    }

    if (votingEndDate <= votingStartDate) {
      setError("Voting close date must be after the voting open date.");
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
        votingStartAt: votingStartDate.toISOString(),
        votingEndAt: votingEndDate.toISOString(),
        contestantsCanViewOwnVotes,
        contestantsCanViewLeaderboard,
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
        // Stay on the page so the user can either submit for approval or keep editing.
        setSavedDraft(created);
        setStepIndex(STEPS.length - 1);
        setSuccess("Saved as draft.");
      }
    } catch (submissionError) {
      if (submissionError instanceof ApiClientError) setError(submissionError.message);
      else setError("Unable to save the event right now.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForApproval() {
    const target = effectiveEvent;
    if (!target) return;
    setIsSubmittingForApproval(true);
    setError(null);
    setSuccess(null);

    try {
      const result =
        target.status === "REJECTED"
          ? await resubmitEvent(target.id)
          : await submitEvent(target.id);

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
    <div className="mx-auto w-full max-w-[1480px] pb-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#0f4cdb]">
            {isUpdate ? "Event workspace" : "New event"}
          </p>
          <h1 className="mt-2 font-display text-[2.35rem] font-semibold tracking-[-0.04em] text-[#07111f] sm:text-[2.8rem]">
            {pageHeading}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#07111f]/62">
            Build the event in guided steps with a live card preview and a cleaner approval workflow.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#dce6f7] bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#07111f]/58">
              5-step setup
            </span>
            <span className="rounded-full border border-[#dce6f7] bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#07111f]/58">
              Live preview enabled
            </span>
          </div>
        </div>
        {isUpdate && (
          <span className="rounded-full border border-[#dbe3f2] bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#07111f]/65 shadow-[0_12px_30px_-24px_rgba(7,17,31,0.6)]">
            {formatStatusLabel(initialEvent?.status)}
          </span>
        )}
      </div>

      {initialEvent?.rejectionReason && (
        <div className="mb-6 flex items-start gap-3 rounded-[24px] border border-[#f1c6c8] bg-[#fff7f7] px-5 py-4 text-[13px] text-[#8f2430] shadow-[0_20px_45px_-34px_rgba(143,36,48,0.5)]">
          <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <span className="font-semibold">Rejection reason: </span>
            {initialEvent.rejectionReason}
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(247,250,255,0.97)_55%,rgba(243,247,252,0.94)_100%)] p-4 shadow-[0_28px_80px_-52px_rgba(7,17,31,0.24)] sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(180,15,23,0.08),transparent_24%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
          <nav
            aria-label="Form steps"
            className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,250,255,0.92)_100%)] p-4 shadow-[0_22px_60px_-46px_rgba(7,17,31,0.24)] lg:sticky lg:top-24 lg:self-start"
          >
            <div className="rounded-[22px] bg-[#0d1730] px-4 py-4 text-white shadow-[0_18px_36px_-28px_rgba(11,22,50,0.7)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/64">
                Event setup
              </p>
              <p className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.03em]">
                Guided creation flow
              </p>
              <p className="mt-2 text-[12px] leading-5 text-white/70">
                Each section moves the event closer to a publish-ready draft.
              </p>
            </div>

            <div className="mt-4 rounded-[22px] border border-[#e8eef7] bg-white/90 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#07111f]/42">
                    Completion
                  </p>
                  <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#07111f]">
                    {completedStepCount}
                    <span className="text-[15px] text-[#07111f]/38">/{STEPS.length}</span>
                  </p>
                </div>
                <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-semibold text-[#0f4cdb]">
                  Step {stepIndex + 1}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1f7]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0f4cdb_0%,#2e6ef0_100%)] transition-all duration-300"
                  style={{ width: `${(completedStepCount / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <ol className="mt-4 space-y-2.5">
            {STEPS.map((s, i) => {
              const Icon = stepIcons[s.key];
              const isActive = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setStepIndex(i)}
                    className={`group relative flex w-full items-start gap-3 rounded-[20px] border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[#d9e5ff] bg-[#f5f8ff] shadow-[0_14px_26px_-22px_rgba(15,76,219,0.45)]"
                        : "border-transparent bg-white/55 hover:border-[#e3ebf7] hover:bg-white"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] transition ${
                        isActive
                          ? "bg-[linear-gradient(135deg,#0f4cdb_0%,#255fe5_100%)] text-white shadow-[0_12px_24px_-16px_rgba(15,76,219,0.75)]"
                          : isDone
                            ? "bg-[#edf3ff] text-[#0f4cdb]"
                            : "bg-[#f4f6fa] text-[#9aa4b6]"
                      }`}
                    >
                      {isDone ? <IconCheck /> : <Icon />}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-[13px] font-semibold leading-tight tracking-[-0.01em] ${
                          isActive
                            ? "text-[#07111f]"
                            : isDone
                              ? "text-[#07111f]"
                              : "text-[#07111f]/55"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-[#9aa4b6]">
                        {s.subtitle}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            </ol>
          </nav>

          <form
            id="event-editor-form"
            onSubmit={handleSubmit}
            noValidate
            className="overflow-hidden rounded-[28px] border border-white/80 bg-white/94 shadow-[0_26px_68px_-50px_rgba(7,17,31,0.26)]"
          >
            <div className="border-b border-[#edf2f8] px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#0f4cdb_0%,#215de4_100%)] text-white shadow-[0_14px_28px_-20px_rgba(15,76,219,0.72)]">
                    <CurrentStepIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f4cdb]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0f4cdb]" />
                        Step {stepIndex + 1} / {STEPS.length}
                      </span>
                      <span className="rounded-full border border-[#e8eef7] bg-[#fbfcff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#07111f]/52">
                        {currentStep.subtitle}
                      </span>
                    </div>
                    <h2
                      key={currentStep.key}
                      className="mt-4 animate-fade-up font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-[#07111f]"
                    >
                      {currentStep.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#07111f]/58">
                      {currentStep.description}
                    </p>
                  </div>
                </div>
                  <div className="min-w-[180px] flex-1 max-w-[260px]">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-[#07111f]/48">
                    <span>Progress</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#edf1f7]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#b40f17_0%,#0f4cdb_100%)] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div key={currentStep.key} className="animate-fade-up px-6 py-7 sm:px-8">
            {/* ── Step: Basics ── */}
            {currentStep.key === "basics" && (
              <div className="rounded-[26px] border border-[#edf2f8] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f4cdb]">
                      Identity
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-[#07111f]/58">
                      Use a specific event name and a description that tells voters exactly what this event is about.
                    </p>
                  </div>
                </div>
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
                <div className="mt-5 rounded-[20px] border border-[#e8eef7] bg-[#fafcff] px-4 py-3 text-[13px] leading-6 text-[#07111f]/58">
                  Use a public-facing name, state what people are voting for, and keep the first sentence strong because it appears in previews.
                </div>
              </div>
            )}

            {currentStep.key === "schedule" && (
              <div className="rounded-[26px] border border-[#edf2f8] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f4cdb]">
                    Timing
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#07111f]/58">
                    Nominations are optional. Voting dates are required and should reflect the exact public window.
                  </p>
                </div>
                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[#e8eef7] bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07111f]/42">
                      Nominations
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[#07111f]/58">
                      Use only if your event collects entries before voting starts.
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[#e8eef7] bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07111f]/42">
                      Voting
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[#07111f]/58">
                      These dates control the public vote window and should be exact.
                    </p>
                  </div>
                </div>
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
                <div className="my-6 h-px bg-[#eef1f6]" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Voting opens" required>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={votingStartAt}
                      min={minVotingDateTime}
                      onChange={(e) => setVotingStartAt(e.target.value)}
                      disabled={!isEditable}
                    />
                  </Field>
                  <Field label="Voting closes" required>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={votingEndAt}
                      min={votingStartAt || minVotingDateTime}
                      onChange={(e) => setVotingEndAt(e.target.value)}
                      disabled={!isEditable}
                    />
                  </Field>
                </div>

                {/* Visibility settings */}
                <div className="mt-6 rounded-2xl border border-[#e8edf6] bg-[#f7f9fc] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#07111f]/50">
                    Contestant visibility
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-[#07111f]/50">
                    Control what contestants can see while voting is live.
                  </p>
                  <div className="mt-4 space-y-3">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${contestantsCanViewOwnVotes ? "border-[#0f4cdb]/28 bg-[#eef4ff]" : "border-[#e4eaf4] bg-white"} ${!isEditable ? "opacity-50" : ""}`}>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0f4cdb]"
                        checked={contestantsCanViewOwnVotes}
                        onChange={(e) => setContestantsCanViewOwnVotes(e.target.checked)}
                        disabled={!isEditable}
                      />
                      <div>
                        <p className="text-[13px] font-semibold text-[#07111f]">
                          Contestants can see their own votes
                        </p>
                        <p className="mt-0.5 text-[12px] leading-5 text-[#07111f]/50">
                          Each contestant can view only their personal vote count.
                        </p>
                      </div>
                    </label>

                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${contestantsCanViewLeaderboard ? "border-[#0f4cdb]/28 bg-[#eef4ff]" : "border-[#e4eaf4] bg-white"} ${!isEditable ? "opacity-50" : ""}`}>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0f4cdb]"
                        checked={contestantsCanViewLeaderboard}
                        onChange={(e) => setContestantsCanViewLeaderboard(e.target.checked)}
                        disabled={!isEditable}
                      />
                      <div>
                        <p className="text-[13px] font-semibold text-[#07111f]">
                          Contestants can see the leaderboard
                        </p>
                        <p className="mt-0.5 text-[12px] leading-5 text-[#07111f]/50">
                          All contestants can view total vote counts for every other contestant.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {currentStep.key === "media" && (
              <div className="rounded-[26px] border border-[#edf2f8] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f4cdb]">
                    Visual assets
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#07111f]/58">
                    The flyer drives the card preview. Add a banner if you want a more polished event detail page.
                  </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                <Field label="Primary flyer" required hint="Shown on the public event page. PNG, JPG, or WEBP, up to 10MB.">
                  {primaryFlyerUrl ? (
                    <div className="relative overflow-hidden rounded-[24px] border border-[#e1e6ef] bg-white">
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
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[#dce6f7] bg-[linear-gradient(180deg,#fbfcff_0%,#f5f9ff_100%)] px-6 py-12 text-center transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f4cdb]/10 text-[#0f4cdb]">
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

                <Field label="Banner" optional hint="Wide banner shown above event details. Recommended 1600 × 600.">
                  {bannerUrl ? (
                    <div className="relative overflow-hidden rounded-[24px] border border-[#e1e6ef] bg-white">
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
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[#dce6f7] bg-[linear-gradient(180deg,#fbfcff_0%,#f8fafc_100%)] px-6 py-10 text-center transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07111f]/6 text-[#07111f]/45">
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
              </div>
            )}

            {currentStep.key === "categories" && (
              <div className="rounded-[26px] border border-[#edf2f8] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f4cdb]">
                    Ballot structure
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#07111f]/58">
                    Add the award tracks or voting groups users can vote on. Each one can have its own price.
                  </p>
                </div>
                <p className="text-[13px] text-[#9aa4b6]">
                  Add at least one voting track. Each track has its own price.
                </p>

                <div className="space-y-3">
                  {categories.map((category, index) => (
                    <div
                      key={`${index}-${category.sortOrder}`}
                      className="overflow-hidden rounded-[24px] border border-[#e1e6ef] bg-white shadow-[0_18px_40px_-36px_rgba(7,17,31,0.28)]"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[#eef1f6] bg-[#fafcff] px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#0f4cdb]/10 text-[11px] font-bold text-[#0f4cdb]">
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-[#d6deeb] bg-[#fafbfd] px-4 py-3.5 text-[13px] font-semibold text-[#0f4cdb] transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add another category
                  </button>
                )}
              </div>
            )}

            {currentStep.key === "review" && (
              <div className="rounded-[26px] border border-[#edf2f8] bg-[linear-gradient(180deg,#fbfcff_0%,#ffffff_100%)] p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0f4cdb]">
                    Final review
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#07111f]/58">
                    Save the draft first if this is a new event, then submit it for admin approval when everything looks right.
                  </p>
                </div>
                <div className="space-y-5">
                {savedDraft && (
                  <div className="relative overflow-hidden rounded-xl border border-[#bfe4d2] bg-gradient-to-br from-[#f2fbf6] via-white to-[#eaf3ff] p-5 shadow-[0_10px_30px_-15px_rgba(27,111,75,0.4)]">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 animate-pop-in items-center justify-center rounded-full bg-gradient-to-br from-[#1b6f4b] to-[#0d4a30] text-white shadow-[0_8px_20px_-6px_rgba(27,111,75,0.6)]">
                        <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1b6f4b]">
                          Saved as draft
                        </p>
                        <h3 className="mt-1 font-display text-[1.25rem] font-bold tracking-[-0.01em] text-[#07111f]">
                          Your event is ready to submit
                        </h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#07111f]/65">
                          Submit it for admin approval, or keep editing the details.
                          You can also revisit it later from{" "}
                          <span className="font-semibold text-[#0f4cdb]">My Events</span>.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSubmitForApproval()}
                            disabled={isSubmittingForApproval}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[#b40f17] to-[#7d0a10] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(180,15,23,0.55)] transition hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(180,15,23,0.65)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                          >
                            {isSubmittingForApproval ? "Submitting…" : "Submit for approval"}
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/events/${savedDraft.id}`)}
                            className="inline-flex items-center justify-center rounded-lg border border-[#d6deeb] bg-white px-4 py-2.5 text-[13px] font-bold text-[#07111f] transition hover:-translate-y-px hover:border-[#0f4cdb]/40 hover:text-[#0f4cdb]"
                          >
                            View event
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
              </div>
            )}

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

            <div className="flex items-center justify-between gap-3 border-t border-[#eef1f6] bg-[linear-gradient(180deg,#fbfcff_0%,#f7f9fc_100%)] px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={() => setStepIndex((s) => Math.max(s - 1, 0))}
              disabled={isFirstStep}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d8e0ee] bg-white px-5 py-3 text-[13px] font-semibold text-[#07111f] transition hover:border-[#07111f]/30 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#0f4cdb_0%,#215de4_100%)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_18px_34px_-20px_rgba(15,76,219,0.9)] transition hover:-translate-y-px"
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
                    className="inline-flex items-center justify-center rounded-full bg-[#b40f17] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#960d14] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingForApproval
                      ? "Submitting…"
                      : (effectiveEvent?.status === "REJECTED" ? "Resubmit" : "Submit for approval")}
                  </button>
                )}
                {(!savedDraft || isUpdate) && (
                  <button
                    type="submit"
                    disabled={!isEditable || isSaving}
                    className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f4cdb_0%,#215de4_100%)] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#0a3aa8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : isUpdate ? "Save changes" : "Save as draft"}
                  </button>
                )}
              </div>
            )}
            </div>
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_26px_68px_-50px_rgba(7,17,31,0.26)]">
              <div className="border-b border-[#eef1f6] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#07111f]/48">
                      Live preview
                    </p>
                    <p className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-[#07111f]">
                      Event card
                    </p>
                  </div>
                  {(savedDraft || initialEvent) && (
                    <span className="rounded-full border border-[#e1e6ef] bg-[#fafbfd] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#07111f]/70">
                      {formatStatusLabel((savedDraft ?? initialEvent)?.status)}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] bg-[#f7f9fd] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07111f]/42">
                      Categories
                    </p>
                    <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-[#07111f]">
                      {categories.length}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[#f7f9fd] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07111f]/42">
                      Voting opens
                    </p>
                    <p className="mt-2 text-[13px] font-semibold leading-5 text-[#07111f]">
                      {formatPreviewDate(votingStartAt)}
                    </p>
                  </div>
                </div>

                {bannerUrl && (
                  <div className="relative h-24 overflow-hidden rounded-[24px] border border-[#edf1f7]">
                    <Image
                      src={bannerUrl}
                      alt="Event banner preview"
                      fill
                      className="object-cover"
                      sizes="340px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#07111f]/28 via-transparent to-transparent" />
                  </div>
                )}

                <div className="overflow-hidden rounded-[24px] border border-[#edf1f7] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-3.5">
                  <div className="overflow-hidden rounded-[22px] border border-[#eef1f6] bg-[#fafbfd]">
                    <div className="relative aspect-[3/4] w-full">
                  {primaryFlyerUrl ? (
                    <Image
                      key={primaryFlyerUrl}
                      src={primaryFlyerUrl}
                      alt="Event flyer preview"
                      fill
                      className="animate-image-in object-cover"
                      sizes="340px"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f4cdb]/10 text-[#0f4cdb]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="text-[12px] font-medium text-[#9aa4b6]">No cover yet</p>
                    </div>
                  )}
                    </div>
                  </div>
                  <h3
                    key={`title-${name}`}
                    className="mt-4 animate-fade-up truncate font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-[#07111f]"
                  >
                    {name || "Your event name"}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-[#07111f]/55">
                    {description || "A short summary will appear here."}
                  </p>

                  <div className="mt-4 grid gap-3 rounded-[20px] bg-[#f7f9fd] p-4 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#9aa4b6]">Voting opens</span>
                      <span className="font-semibold text-[#07111f]">{formatPreviewDate(votingStartAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#9aa4b6]">Voting closes</span>
                      <span className="font-semibold text-[#07111f]">{formatPreviewDate(votingEndAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {categoryPreview.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-[#dbe5f5] bg-white px-3 py-1 text-[11px] font-semibold text-[#07111f]/66"
                      >
                        {category}
                      </span>
                    ))}
                    {categories.length > 3 && (
                      <span className="rounded-full border border-[#dbe5f5] bg-white px-3 py-1 text-[11px] font-semibold text-[#0f4cdb]">
                        +{categories.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#edf1f7] bg-[#fbfcff] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#07111f]/42">
                    Readiness
                  </p>
                  <div className="mt-4 space-y-3">
                    {previewChecks.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-[#07111f]/72">{item.label}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.done
                              ? "bg-[#e9f8f0] text-[#1b6f4b]"
                              : "bg-[#fff1f2] text-[#b40f17]"
                          }`}
                        >
                          {item.done ? "Ready" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
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
