import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateDrafts,
  harvestPattern,
  listAllDrafts,
  listIdeas,
  listPatterns,
  listProducts,
  saveDossier,
  scan,
  setArcStatus,
  setDraftStatus,
  setSourceExcluded,
  triage,
} from "@/lib/conjurer";

export const keys = {
  drafts: ["drafts"] as const,
  ideas: ["ideas"] as const,
  patterns: ["patterns"] as const,
  products: ["products"] as const,
};

export function useDrafts() {
  return useQuery({ queryKey: keys.drafts, queryFn: listAllDrafts });
}

export function useIdeas() {
  return useQuery({ queryKey: keys.ideas, queryFn: listIdeas });
}

export function usePatterns() {
  return useQuery({ queryKey: keys.patterns, queryFn: listPatterns });
}

export function useProducts() {
  return useQuery({ queryKey: keys.products, queryFn: listProducts });
}

// Every mutation changes something every view is a projection of, so they all
// invalidate the whole set rather than trying to predict the blast radius.
function useRefreshingMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(Object.values(keys).map((k) => qc.invalidateQueries({ queryKey: k }))),
  });
}

export function useScan() {
  return useRefreshingMutation((a: { root: string; since: string; only?: string }) =>
    scan(a.root, a.since, a.only),
  );
}

export function useTriage() {
  return useRefreshingMutation((limit: number) => triage(limit));
}

export function useGenerate() {
  return useRefreshingMutation((a: { arcId: number; patternId: number }) =>
    generateDrafts(a.arcId, a.patternId),
  );
}

export function useSetArcStatus() {
  return useRefreshingMutation((a: { id: number; status: "keep" | "skip" }) =>
    setArcStatus(a.id, a.status),
  );
}

export function useSetDraftStatus() {
  return useRefreshingMutation((a: { id: number; status: "new" | "used" | "discarded" }) =>
    setDraftStatus(a.id, a.status),
  );
}

export function useSaveDossier() {
  return useRefreshingMutation(
    (a: { id: number; what_it_does: string; audience: string; moments: string }) =>
      saveDossier(a.id, {
        what_it_does: a.what_it_does,
        audience: a.audience,
        moments: a.moments,
      }),
  );
}

export function useSetSourceExcluded() {
  return useRefreshingMutation((a: { id: number; excluded: boolean }) =>
    setSourceExcluded(a.id, a.excluded),
  );
}

export function useHarvestPattern() {
  return useRefreshingMutation((text: string) => harvestPattern({ text, platform: "Facebook" }));
}
