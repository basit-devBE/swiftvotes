export type UserResponse = {
  id: string;
  email: string;
  fullName: string;
  systemRole: "SUPER_ADMIN" | "NONE";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  accessTokenExpiresIn: string;
  user: UserResponse;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  fullName: string;
  password: string;
};

export type UpdateCurrentUserInput = {
  fullName: string;
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export type EventStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "APPROVED"
  | "NOMINATIONS_OPEN"
  | "NOMINATIONS_CLOSED"
  | "VOTING_SCHEDULED"
  | "VOTING_LIVE"
  | "VOTING_CLOSED"
  | "ARCHIVED";

export type EventCategoryResponse = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  votePriceMinor: number;
  currency: string;
  imageUrl: string | null;
  imageKey: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type EventResponse = {
  id: string;
  creatorUserId: string;
  name: string;
  slug: string;
  description: string;
  status: EventStatus;
  primaryFlyerUrl: string;
  primaryFlyerKey: string;
  bannerUrl: string | null;
  bannerKey: string | null;
  nominationStartAt: string | null;
  nominationEndAt: string | null;
  votingStartAt: string;
  votingEndAt: string;
  contestantsCanViewOwnVotes: boolean;
  contestantsCanViewLeaderboard: boolean;
  publicCanViewLeaderboard: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  rejectedAt: string | null;
  rejectedByUserId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  categories: EventCategoryResponse[];
};

export type CreateEventCategoryInput = {
  name: string;
  description: string;
  votePriceMinor: number;
  currency: string;
  imageUrl?: string;
  imageKey?: string;
  sortOrder: number;
};

export type CreateEventInput = {
  name: string;
  description: string;
  primaryFlyerUrl: string;
  primaryFlyerKey: string;
  bannerUrl?: string;
  bannerKey?: string;
  nominationStartAt?: string;
  nominationEndAt?: string;
  votingStartAt: string;
  votingEndAt: string;
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
  categories: CreateEventCategoryInput[];
};

export type UpdateEventInput = Partial<Omit<CreateEventInput, "categories">> & {
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
};

export type NominationStatus = "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";

export type NominationResponse = {
  id: string;
  eventId: string;
  categoryId: string;
  submittedByUserId: string | null;
  submitterName: string;
  submitterEmail: string | null;
  submitterPhone: string | null;
  nomineeName: string;
  nomineeEmail: string | null;
  nomineePhone: string | null;
  nomineeImageUrl: string | null;
  nomineeImageKey: string | null;
  status: NominationStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RejectNominationInput = {
  reason: string;
};

export type ConfirmNominationInput = {
  nomineeEmail?: string;
};

export type SubmitNominationInput = {
  categoryId: string;
  submitterName: string;
  submitterEmail?: string;
  submitterPhone: string;
  nomineeName: string;
  nomineeEmail?: string;
  nomineePhone: string;
  nomineeImageUrl?: string;
  nomineeImageKey?: string;
};

export type ContestantResponse = {
  id: string;
  eventId: string;
  categoryId: string;
  nominationId: string;
  userId: string | null;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  imageKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateContestantInput = {
  categoryId?: string;
  name?: string;
  phone?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
};

export type ContestantCredentialsResponse = {
  email: string | null;
  hasAccount: boolean;
  magicLinkUrl: string | null;
};

export type CreateUploadIntentInput = {
  fileName: string;
  contentType: string;
  eventId?: string;
  categoryId?: string;
  nominationId?: string;
};

export type UploadIntentResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
};

export type CastVoteInput = {
  contestantId: string;
  quantity: number;
  voterName: string;
  voterEmail: string;
  callbackOrigin?: string;
};

export type VoteStatus = "FREE" | "PENDING_PAYMENT" | "CONFIRMED" | "FAILED";

export type CastVoteResponse = {
  type: "free" | "payment";
  voteId: string;
  status: VoteStatus;
  quantity: number;
  amountMinor: number;
  currency: string;
  reference: string | null;
  paymentUrl: string | null;
};

export type VerifyVoteResponse = {
  voteId: string;
  status: VoteStatus;
  eventId: string;
  contestantId: string;
  categoryId: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  reference: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  voteCount: number;
};

export type LeaderboardCategory = {
  categoryId: string;
  categoryName: string;
  contestants: LeaderboardEntry[];
};

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "ABANDONED"
  | "REFUNDED";

export type PaymentResponse = {
  id: string;
  reference: string;
  providerRef: string | null;
  provider: string;
  amountMinor: number;
  amountPaidMinor: number | null;
  feeMinor: number | null;
  currency: string;
  status: PaymentStatus;
  initializedAt: string;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  voterEmail: string;
  voterName: string | null;
  channel: string | null;
  cardLast4: string | null;
  mobileNumber: string | null;
  customerIp: string | null;
  eventId: string;
  eventName: string | null;
  categoryId: string;
  categoryName: string | null;
  contestantId: string;
  contestantName: string | null;
  contestantCode: string | null;
  voteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentWebhookEventResponse = {
  id: string;
  eventType: string;
  signatureValid: boolean;
  receivedAt: string;
  processed: boolean;
  processedAt: string | null;
};

export type PaymentSummaryResponse = {
  totalCount: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  abandonedCount: number;
  refundedCount: number;
  grossMinor: number;
  feesMinor: number;
  netMinor: number;
  currency: string | null;
  byStatus: Array<{ status: PaymentStatus; count: number }>;
  byChannel: Array<{ channel: string; count: number; totalAmountMinor: number }>;
};

export type PaymentListResponse = {
  rows: PaymentResponse[];
  total: number;
  page: number;
  pageSize: number;
  summary: PaymentSummaryResponse;
};

export type PaymentDetailResponse = {
  payment: PaymentResponse;
  webhookEvents: PaymentWebhookEventResponse[];
};

export type EventVotesSummaryResponse = {
  votes: {
    totalVotes: number;
    freeVotes: number;
    paidVotes: number;
    uniqueVoters: number;
  };
  payments: PaymentSummaryResponse;
};

export type ListPaymentsFilters = {
  status?: PaymentStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type MyContestantSummaryResponse = {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  createdAt: string;
  event: {
    id: string;
    name: string;
    slug: string;
    status: EventStatus;
    votingStartAt: string;
    votingEndAt: string;
    primaryFlyerUrl: string;
    bannerUrl: string | null;
  };
  category: {
    id: string;
    name: string;
  };
};

export type MyContestantProfileResponse = {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  email: string | null;
  voteCount: number | null;
  createdAt: string;
  event: {
    id: string;
    name: string;
    slug: string;
    status: EventStatus;
    contestantsCanViewOwnVotes: boolean;
    contestantsCanViewLeaderboard: boolean;
    votingStartAt: string;
    votingEndAt: string;
    primaryFlyerUrl: string;
    bannerUrl: string | null;
  };
  category: {
    id: string;
    name: string;
  };
};
