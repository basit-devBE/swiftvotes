import { AppLoadingState } from "@/components/app-loading-state";

export default function Loading() {
  return (
    <AppLoadingState
      fullScreen
      label="Loading SwiftVote"
      detail="Preparing the next page."
    />
  );
}
