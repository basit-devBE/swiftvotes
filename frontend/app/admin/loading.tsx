import { AppLoadingState } from "@/components/app-loading-state";

export default function AdminLoading() {
  return (
    <div className="px-8 py-10">
      <AppLoadingState
        label="Loading admin"
        detail="Fetching event, payment, and account data."
      />
    </div>
  );
}
