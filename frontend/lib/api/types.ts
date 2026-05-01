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
  categories: CreateEventCategoryInput[];
};

export type UpdateEventInput = Partial<Omit<CreateEventInput, "categories">> & {
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
};

export type NominationStatus = "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";

export type NominationResponse = {
  id: string;
  eventId: string;
  categoryId: string;
  submittedByUserId: string | null;
  submitterName: string;
  submitterEmail: string;
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

export type SubmitNominationInput = {
  categoryId: string;
  submitterName: string;
  submitterEmail: string;
  nomineeName: string;
  nomineeEmail?: string;
  nomineePhone?: string;
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

export type MyContestantProfileResponse = {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  email: string | null;
  voteCount: number;
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
