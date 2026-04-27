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

const inputClassName =
  "h-12 w-full rounded-xl border border-[#d6deeb] bg-[#f7f9fc] px-4 text-[15px] text-[#07111f] outline-none transition placeholder:text-[#07111f]/28 focus:border-[#0f4cdb] focus:bg-white focus:ring-2 focus:ring-[#0f4cdb]/10 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-[10rem] w-full rounded-xl border border-[#d6deeb] bg-[#f7f9fc] px-4 py-3.5 text-[15px] text-[#07111f] outline-none transition placeholder:text-[#07111f]/28 focus:border-[#0f4cdb] focus:bg-white focus:ring-2 focus:ring-[#0f4cdb]/10 disabled:cursor-not-allowed disabled:opacity-50";

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) {
    return "";
  }

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

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Free voting";
  }

  return `${currency || "GHS"} ${numeric.toLocaleString()}`;
}

function formatStatusLabel(status?: string): string {
  return status?.replaceAll("_", " ") ?? "DRAFT";
}

export function EventEditor({ mode, initialEvent }: EventEditorProps) {
  const router = useRouter();
  const isUpdate = mode === "update" && initialEvent;
  const isEditable =
    !isUpdate ||
    ["DRAFT", "REJECTED"].includes(initialEvent?.status ?? "DRAFT");

  const [name, setName] = useState(initialEvent?.name ?? "");
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [primaryFlyerUrl, setPrimaryFlyerUrl] = useState(
    initialEvent?.primaryFlyerUrl ?? "",
  );
  const [primaryFlyerKey, setPrimaryFlyerKey] = useState(
    initialEvent?.primaryFlyerKey ?? "",
  );
  const [bannerUrl, setBannerUrl] = useState(initialEvent?.bannerUrl ?? "");
  const [bannerKey, setBannerKey] = useState(initialEvent?.bannerKey ?? "");
  const [nominationStartAt, setNominationStartAt] = useState(
    toDateTimeLocalValue(initialEvent?.nominationStartAt),
  );
  const [nominationEndAt, setNominationEndAt] = useState(
    toDateTimeLocalValue(initialEvent?.nominationEndAt),
  );
  const [votingStartAt, setVotingStartAt] = useState(
    toDateTimeLocalValue(initialEvent?.votingStartAt),
  );
  const [votingEndAt, setVotingEndAt] = useState(
    toDateTimeLocalValue(initialEvent?.votingEndAt),
  );
  const [categories, setCategories] = useState<EditableCategory[]>(
    initialEvent?.categories.length
      ? initialEvent.categories.map((category) => ({
          name: category.name,
          description: category.description,
          votePriceMinor: String(category.votePriceMinor),
          currency: category.currency,
          sortOrder: category.sortOrder,
        }))
      : [
          {
            name: "",
            description: "",
            votePriceMinor: "0",
            currency: "GHS",
            sortOrder: 0,
          },
        ],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const pageHeading = useMemo(() => {
    if (!isUpdate) {
      return "Create Event";
    }

    return initialEvent?.status === "REJECTED" ? "Revise Event" : "Manage Event";
  }, [initialEvent?.status, isUpdate]);

  const canSubmitForApproval =
    Boolean(initialEvent) &&
    ["DRAFT", "REJECTED"].includes(initialEvent?.status ?? "DRAFT") &&
    !isSaving;

  async function handleAssetUpload(file: File, kind: "flyer" | "banner") {
    if (kind === "flyer") {
      setIsUploadingFlyer(true);
    } else {
      setIsUploadingBanner(true);
    }

    setError(null);

    try {
      const intent =
        kind === "flyer"
          ? await createEventFlyerUploadIntent({
              fileName: file.name,
              contentType: file.type,
              eventId: initialEvent?.id,
            })
          : await createEventBannerUploadIntent({
              fileName: file.name,
              contentType: file.type,
              eventId: initialEvent?.id,
            });

      await uploadFileToSignedUrl(intent.uploadUrl, file);

      if (kind === "flyer") {
        setPrimaryFlyerUrl(intent.publicUrl);
        setPrimaryFlyerKey(intent.key);
      } else {
        setBannerUrl(intent.publicUrl);
        setBannerKey(intent.key);
      }
    } catch (uploadError) {
      if (uploadError instanceof ApiClientError) {
        setError(uploadError.message);
      } else if (uploadError instanceof Error) {
        setError(uploadError.message);
      } else {
        setError("Unable to upload media right now.");
      }
    } finally {
      if (kind === "flyer") {
        setIsUploadingFlyer(false);
      } else {
        setIsUploadingBanner(false);
      }
    }
  }

  function updateCategoryField(
    index: number,
    field: keyof EditableCategory,
    value: string | number,
  ) {
    setCategories((current) =>
      current.map((category, currentIndex) =>
        currentIndex === index ? { ...category, [field]: value } : category,
      ),
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
        .filter((_, currentIndex) => currentIndex !== index)
        .map((category, currentIndex) => ({
          ...category,
          sortOrder: currentIndex,
        })),
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
        categories: categories.map((category, index) => ({
          name: category.name,
          description: category.description,
          votePriceMinor: Number.parseInt(category.votePriceMinor || "0", 10),
          currency: category.currency.trim().toUpperCase(),
          sortOrder: index,
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
      if (submissionError instanceof ApiClientError) {
        setError(submissionError.message);
      } else {
        setError("Unable to save the event right now.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!initialEvent) {
      return;
    }

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
      if (submissionError instanceof ApiClientError) {
        setError(submissionError.message);
      } else {
        setError("Unable to submit the event for approval.");
      }
    } finally {
      setIsSubmittingForApproval(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1320px] pb-16">
      {/* ── Page header ── */}
      <div className="relative mb-10 overflow-hidden rounded-[2rem] bg-[#07111f] px-8 py-10 sm:px-10 sm:py-12">
        {/* Decorative radial glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#0f4cdb] opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-64 w-64 rounded-full bg-[#b40f17] opacity-10 blur-2xl" />
        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[0.67rem] font-semibold uppercase tracking-[0.28em] text-white/70 backdrop-blur">
              {isUpdate ? "Event workspace" : "Event builder"}
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-white sm:text-5xl">
              {pageHeading}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/55">
              Build the event details, media, and category pricing in one place.
            </p>
          </div>

          {isUpdate ? (
            <span className="mt-1 shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur">
              {formatStatusLabel(initialEvent?.status)}
            </span>
          ) : null}
        </div>
      </div>

      {initialEvent?.rejectionReason ? (
        <div className="mb-8 flex items-start gap-4 rounded-[1.4rem] border border-[#f1c6c8] bg-[#fff4f4] px-5 py-4">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b40f17]/10 text-[#b40f17]">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          </div>
          <div className="text-sm text-[#8f2430]">
            <span className="font-semibold">Rejection reason: </span>
            {initialEvent.rejectionReason}
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          id="event-editor-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="relative overflow-hidden rounded-[1.8rem] border border-[#d6deeb] bg-white p-6 shadow-[0_4px_24px_rgba(7,17,31,0.06),0_1px_4px_rgba(7,17,31,0.04)] sm:p-8">
            {/* Blue left accent bar */}
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-[1.8rem] bg-gradient-to-b from-[#0f4cdb] to-[#3b6ef5]" />
            <div className="flex items-center gap-3 pl-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f4cdb] text-xs font-bold text-white shadow-[0_2px_8px_rgba(15,76,219,0.4)]">1</span>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#0f4cdb]/70">
                Basic info
              </p>
            </div>
            <h2 className="mt-4 pl-2 font-display text-2xl font-semibold tracking-[-0.03em] text-[#07111f]">
              Tell people what the event is about.
            </h2>
            <div className="mt-6 grid gap-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#07111f]/60">Event name</span>
                <input
                  className={inputClassName}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Campus Choice Awards 2026"
                  required
                  disabled={!isEditable}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#07111f]/60">Description</span>
                <textarea
                  className={textareaClassName}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the event, audience, and nomination or voting focus."
                  required
                  disabled={!isEditable}
                />
              </label>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[1.8rem] border border-[#d6deeb] bg-white p-6 shadow-[0_4px_24px_rgba(7,17,31,0.06),0_1px_4px_rgba(7,17,31,0.04)] sm:p-8">
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-[1.8rem] bg-gradient-to-b from-[#0f4cdb] to-[#3b6ef5]" />
            <div className="flex items-center gap-3 pl-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f4cdb] text-xs font-bold text-white shadow-[0_2px_8px_rgba(15,76,219,0.4)]">2</span>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#0f4cdb]/70">
                Timeline
              </p>
            </div>
            <h2 className="mt-4 pl-2 font-display text-2xl font-semibold tracking-[-0.03em] text-[#07111f]">
              Schedule nominations and voting.
            </h2>
            {/* Helper note */}
            <div className="mt-3 ml-2 flex items-start gap-2 rounded-xl border border-[#d6deeb] bg-[#f7f9fc] px-4 py-3 text-sm text-[#07111f]/50">
              <svg className="mt-0.5 shrink-0 text-[#0f4cdb]" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              Nomination dates are optional. Voting start and end are required.
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#07111f]/60">Nomination start</span>
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={nominationStartAt}
                  onChange={(event) => setNominationStartAt(event.target.value)}
                  disabled={!isEditable}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#07111f]/60">Nomination end</span>
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={nominationEndAt}
                  onChange={(event) => setNominationEndAt(event.target.value)}
                  disabled={!isEditable}
                />
              </label>
              <label className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#07111f]/60">
                  Voting start
                  <span className="rounded-full bg-[#0f4cdb]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#0f4cdb]">required</span>
                </span>
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={votingStartAt}
                  onChange={(event) => setVotingStartAt(event.target.value)}
                  required
                  disabled={!isEditable}
                />
              </label>
              <label className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#07111f]/60">
                  Voting end
                  <span className="rounded-full bg-[#0f4cdb]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#0f4cdb]">required</span>
                </span>
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={votingEndAt}
                  onChange={(event) => setVotingEndAt(event.target.value)}
                  required
                  disabled={!isEditable}
                />
              </label>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[1.8rem] border border-[#d6deeb] bg-white p-6 shadow-[0_4px_24px_rgba(7,17,31,0.06),0_1px_4px_rgba(7,17,31,0.04)] sm:p-8">
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-[1.8rem] bg-gradient-to-b from-[#0f4cdb] to-[#3b6ef5]" />
            <div className="flex items-center gap-3 pl-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f4cdb] text-xs font-bold text-white shadow-[0_2px_8px_rgba(15,76,219,0.4)]">3</span>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#0f4cdb]/70">
                Media
              </p>
            </div>
            <h2 className="mt-4 pl-2 font-display text-2xl font-semibold tracking-[-0.03em] text-[#07111f]">
              Upload the flyer and optional banner.
            </h2>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <label className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#07111f]/60">Primary flyer</span>
                  <span className="rounded-full bg-[#0f4cdb]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#0f4cdb]">Required</span>
                </div>
                <div className="group overflow-hidden rounded-[1.35rem] border-2 border-dashed border-[#d6deeb] bg-[#f7f9fc] transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]">
                  {primaryFlyerUrl ? (
                    <div className="relative h-72 w-full">
                      <Image
                        src={primaryFlyerUrl}
                        alt="Primary flyer preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 100vw, 34vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f4cdb]/8 text-[#0f4cdb]/50">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16.5V19a1 1 0 001 1h14a1 1 0 001-1v-2.5" /><polyline points="16 10 12 6 8 10" /><line x1="12" y1="6" x2="12" y2="16" /></svg>
                      </div>
                      <p className="text-sm font-medium text-[#07111f]/40">Your main flyer will appear here</p>
                      <p className="text-xs text-[#07111f]/28">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isEditable || isUploadingFlyer}
                  onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      await handleAssetUpload(file, "flyer");
                    }
                  }}
                  className="block w-full text-sm text-[#07111f]/50 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#07111f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition file:hover:bg-[#0f4cdb]"
                />
                {isUploadingFlyer ? (
                  <p className="flex items-center gap-2 text-sm text-[#0f4cdb]"><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#0f4cdb] border-t-transparent" />Uploading flyer…</p>
                ) : null}
              </label>

              <label className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#07111f]/60">Banner</span>
                  <span className="rounded-full bg-[#07111f]/6 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#07111f]/40">Optional</span>
                </div>
                <div className="group overflow-hidden rounded-[1.35rem] border-2 border-dashed border-[#d6deeb] bg-[#f7f9fc] transition hover:border-[#0f4cdb]/40 hover:bg-[#f0f5ff]">
                  {bannerUrl ? (
                    <div className="relative h-72 w-full">
                      <Image
                        src={bannerUrl}
                        alt="Banner preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 100vw, 34vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#07111f]/6 text-[#07111f]/30">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      </div>
                      <p className="text-sm font-medium text-[#07111f]/40">Add a banner for wider visual impact</p>
                      <p className="text-xs text-[#07111f]/28">Recommended 1600 × 600px</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isEditable || isUploadingBanner}
                  onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      await handleAssetUpload(file, "banner");
                    }
                  }}
                  className="block w-full text-sm text-[#07111f]/50 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#07111f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition file:hover:bg-[#0f4cdb]"
                />
                {isUploadingBanner ? (
                  <p className="flex items-center gap-2 text-sm text-[#0f4cdb]"><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#0f4cdb] border-t-transparent" />Uploading banner…</p>
                ) : null}
              </label>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[#d6deeb] bg-white p-6 shadow-[0_24px_64px_rgba(7,17,31,0.05)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8ca5]">
                  Categories
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">
                  Define the voting tracks and prices.
                </h2>
              </div>
              {isEditable ? (
                <button
                  type="button"
                  onClick={addCategory}
                  className="inline-flex items-center rounded-full border border-[#d6deeb] bg-white px-4 py-3 text-sm font-semibold text-[#07111f] transition hover:border-[#0f4cdb]/30 hover:text-[#0f4cdb]"
                >
                  Add category
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-5">
              {categories.map((category, index) => (
                <div
                  key={`${index}-${category.sortOrder}`}
                  className="overflow-hidden rounded-[1.35rem] border border-[#d6deeb] bg-[#f7f9fc]"
                >
                  {/* Category card header strip */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#d6deeb] bg-white px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f4cdb]/10 text-xs font-bold text-[#0f4cdb]">{index + 1}</span>
                      <p className="text-sm font-semibold text-[#07111f]">
                        Category {index + 1}
                      </p>
                    </div>
                    {categories.length > 1 && isEditable ? (
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        className="flex h-7 items-center gap-1 rounded-full border border-[#f1c6c8] bg-white px-3 text-xs font-semibold text-[#b40f17] transition hover:bg-[#fff5f5]"
                      >
                        <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="p-5">

                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#07111f]/60">Category name</span>
                      <input
                        className={inputClassName}
                        value={category.name}
                        onChange={(event) =>
                          updateCategoryField(index, "name", event.target.value)
                        }
                        placeholder="Best Female Personality"
                        required
                        disabled={!isEditable}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#07111f]/60">Description</span>
                      <textarea
                        className="min-h-[7rem] w-full rounded-xl border border-[#d6deeb] bg-[#f7f9fc] px-4 py-3.5 text-[15px] text-[#07111f] outline-none transition placeholder:text-[#07111f]/28 focus:border-[#0f4cdb] focus:bg-white focus:ring-2 focus:ring-[#0f4cdb]/10 disabled:cursor-not-allowed disabled:opacity-50"
                        value={category.description}
                        onChange={(event) =>
                          updateCategoryField(index, "description", event.target.value)
                        }
                        placeholder="Short context for what this category represents."
                        required
                        disabled={!isEditable}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[#07111f]/60">
                          Vote price (minor units)
                        </span>
                        <input
                          type="number"
                          min="0"
                          className={inputClassName}
                          value={category.votePriceMinor}
                          onChange={(event) =>
                            updateCategoryField(
                              index,
                              "votePriceMinor",
                              event.target.value,
                            )
                          }
                          required
                          disabled={!isEditable}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[#07111f]/60">Currency</span>
                        <input
                          className={`${inputClassName} uppercase`}
                          value={category.currency}
                          onChange={(event) =>
                            updateCategoryField(index, "currency", event.target.value)
                          }
                          placeholder="GHS"
                          required
                          disabled={!isEditable}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-[#d6deeb] bg-white px-4 py-2.5">
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#0f4cdb" strokeWidth="2"><circle cx="10" cy="10" r="8" /><path d="M10 6v4l3 3" /></svg>
                      <p className="text-sm font-medium text-[#07111f]/60">
                        {formatPriceLabel(category.votePriceMinor, category.currency)}
                      </p>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error ? (
            <div className="flex items-start gap-3 rounded-[1.4rem] border border-[#f1c6c8] bg-[#fff4f4] px-5 py-4 text-sm font-medium text-[#8f2430]">
              <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="flex items-start gap-3 rounded-[1.4rem] border border-[#bfe4d2] bg-[#f2fbf6] px-5 py-4 text-sm font-medium text-[#1b6f4b]">
              <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {success}
            </div>
          ) : null}
        </form>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <div className="overflow-hidden rounded-[1.8rem] border border-[#d6deeb] bg-white shadow-[0_4px_24px_rgba(7,17,31,0.08),0_1px_4px_rgba(7,17,31,0.05)]">
            <div className="border-b border-[#d6deeb] bg-[#f7f9fc] px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#07111f]/40">
                Live preview
              </p>
            </div>
            <div className="overflow-hidden">
              <div className="relative aspect-[4/5] w-full">
                {primaryFlyerUrl ? (
                  <Image
                    src={primaryFlyerUrl}
                    alt="Event flyer preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f7f9fc] px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f4cdb]/8">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f4cdb" strokeWidth="1.5" strokeOpacity="0.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    </div>
                    <p className="text-sm text-[#07111f]/35">No flyer uploaded yet.</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,23,42,0.84)] via-[rgba(15,23,42,0.12)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/72">
                    Featured event
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold leading-[0.96] tracking-[-0.04em]">
                    {name || "Your event title"}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/84">
                    {description || "A short event summary will appear here once you start filling the form."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] border border-[#d6deeb] bg-white shadow-[0_4px_24px_rgba(7,17,31,0.06),0_1px_4px_rgba(7,17,31,0.04)]">
            <div className="border-b border-[#d6deeb] bg-[#f7f9fc] px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#07111f]/40">
                Summary
              </p>
            </div>
            <dl className="space-y-0 divide-y divide-[#f0f3f8] px-5 py-1 text-sm text-[#07111f]/50">
              <div className="flex items-center justify-between gap-3 py-3.5">
                <dt>Status</dt>
                <dd className="rounded-full bg-[#0f4cdb]/8 px-2.5 py-1 text-xs font-semibold text-[#0f4cdb]">
                  {formatStatusLabel(initialEvent?.status)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-3.5">
                <dt>Nominations</dt>
                <dd className="max-w-[11rem] text-right text-xs font-semibold text-[#07111f]">
                  {nominationStartAt && nominationEndAt
                    ? `${new Date(nominationStartAt).toLocaleDateString()} → ${new Date(nominationEndAt).toLocaleDateString()}`
                    : "Opens after approval"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-3.5">
                <dt>Voting</dt>
                <dd className="max-w-[11rem] text-right text-xs font-semibold text-[#07111f]">
                  {votingStartAt && votingEndAt
                    ? `${new Date(votingStartAt).toLocaleDateString()} → ${new Date(votingEndAt).toLocaleDateString()}`
                    : "Not scheduled yet"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3.5">
                <dt>Categories</dt>
                <dd className="font-semibold text-[#07111f]">{categories.length}</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] border border-[#d6deeb] bg-white shadow-[0_4px_24px_rgba(7,17,31,0.06),0_1px_4px_rgba(7,17,31,0.04)]">
            <div className="border-b border-[#d6deeb] bg-[#f7f9fc] px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#07111f]/40">
                Actions
              </p>
            </div>
            <div className="space-y-3 p-5">
              <button
                type="submit"
                form="event-editor-form"
                disabled={!isEditable || isSaving}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#0f4cdb] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#0930a8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Saving..."
                  : isUpdate
                    ? "Save changes"
                    : "Save draft"}
              </button>

              {canSubmitForApproval ? (
                <button
                  type="button"
                  onClick={() => void handleSubmitForApproval()}
                  disabled={isSubmittingForApproval}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#b40f17] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#960d14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingForApproval
                    ? "Submitting..."
                    : initialEvent?.status === "REJECTED"
                      ? "Resubmit event"
                      : "Submit for approval"}
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
