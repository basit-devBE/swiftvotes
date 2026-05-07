import { apiRequest } from "./client";
import { PaymentListResponse, PaymentStatus } from "./types";

export type AdminPaymentsFilters = {
  status?: PaymentStatus;
  eventId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

function buildQuery(filters: AdminPaymentsFilters): string {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.eventId) qs.set("eventId", filters.eventId);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.search) qs.set("search", filters.search);
  if (filters.page) qs.set("page", String(filters.page));
  if (filters.pageSize) qs.set("pageSize", String(filters.pageSize));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function listAllAdminPayments(
  filters: AdminPaymentsFilters = {},
): Promise<PaymentListResponse> {
  return apiRequest<PaymentListResponse>(
    `/admin/payments${buildQuery(filters)}`,
  );
}

export function exportAllAdminPaymentsCsv(
  filters: Omit<AdminPaymentsFilters, "page" | "pageSize"> = {},
): Promise<string> {
  return apiRequest<string>(`/admin/payments.csv${buildQuery(filters)}`);
}
