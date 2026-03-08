import { useQuery } from "@tanstack/react-query";
import { getAiSummary } from "../api";

export default function AiSummary() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ai-summary"],
    queryFn: getAiSummary,
    staleTime: 300_000,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>🤖</span> AI Incident Summary
        </h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>
      {isLoading ? (
        <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
      ) : isError ? (
        <p className="text-sm text-slate-500 italic">
          Unable to generate summary.
        </p>
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed">
          {data?.summary ?? "No summary available."}
        </p>
      )}
    </div>
  );
}
