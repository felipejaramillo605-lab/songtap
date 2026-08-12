import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ApplauseVotingProps {
  venueId: number;
  songId: number;
  votingTableId: number;
  votingTableName: string;
  performingTableId?: number | null;
  performingTableName?: string | null;
  averageRating?: number;
  totalVotes?: number;
  onSubmitted?: () => void;
}

export default function ApplauseVoting({
  venueId,
  songId,
  votingTableId,
  votingTableName,
  performingTableId,
  performingTableName,
  averageRating = 0,
  totalVotes = 0,
  onSubmitted,
}: ApplauseVotingProps) {
  const [rating, setRating] = useState(5);
  const submitApplause = trpc.music.submitApplause.useMutation({
    onSuccess: () => {
      toast.success("¡Aplausos enviados con éxito!");
      onSubmitted?.();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="pt-3 border-t border-border/60">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-medium text-foreground">¡Califica la presentación!</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Mesa votante: {votingTableName}</p>
        </div>
        {totalVotes > 0 && (
          <span className="text-xs text-yellow-400 font-semibold flex items-center gap-1 shrink-0">
            <Star size={12} className="fill-yellow-400" /> {averageRating.toFixed(1)} · {totalVotes} aplausos
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center" role="radiogroup" aria-label="Puntuación de aplausos">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
              aria-checked={rating === value}
              onClick={() => setRating(value)}
              className={`p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${rating >= value ? "text-yellow-400" : "text-muted-foreground"}`}
            >
              <Star size={22} className={rating >= value ? "fill-yellow-400" : ""} />
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="ml-auto bg-primary text-primary-foreground font-bold text-xs h-9"
          onClick={() => submitApplause.mutate({
            venueId,
            songId,
            votingTableId,
            votingTableName,
            performingTableId: performingTableId ?? undefined,
            performingTableName: performingTableName ?? undefined,
            rating,
          })}
          disabled={submitApplause.isPending}
        >
          {submitApplause.isPending ? "Enviando..." : "Dar aplauso"}
        </Button>
      </div>
    </div>
  );
}
