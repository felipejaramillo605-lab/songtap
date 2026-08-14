import { Button } from "@/components/ui/button";
import { Star, Sparkles, Heart } from "lucide-react";
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

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  icon: "star" | "sparkle" | "heart";
  rotation: number;
  scale: number;
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
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);

  const triggerAnimation = () => {
    const icons: ("star" | "sparkle" | "heart")[] = ["star", "sparkle", "heart", "star", "sparkle"];
    const newParticles: FloatingParticle[] = icons.map((icon, idx) => ({
      id: Date.now() + idx,
      x: (Math.random() - 0.5) * 120, // desplazamiento horizontal aleatorio (-60px a 60px)
      y: -40 - Math.random() * 50,    // desplazamiento vertical hacia arriba (-40px a -90px)
      icon,
      rotation: (Math.random() - 0.5) * 60,
      scale: 0.8 + Math.random() * 0.6,
    }));

    setFloatingParticles(newParticles);
    setTimeout(() => {
      setFloatingParticles([]);
    }, 1200);
  };

  const submitApplause = trpc.music.submitApplause.useMutation({
    onSuccess: () => {
      toast.success("¡Aplausos enviados con éxito! ⭐");
      triggerAnimation();
      onSubmitted?.();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="pt-3 border-t border-border/60 relative overflow-visible">
      {/* Contenedor de partículas flotantes animadas */}
      <div className="absolute left-1/2 top-0 pointer-events-none z-50 overflow-visible">
        {floatingParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute transition-all duration-1000 ease-out opacity-0 translate-y-0 scale-100 animate-float-up"
            style={{
              transform: `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg) scale(${particle.scale})`,
              animation: "floatUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {particle.icon === "star" && <Star size={20} className="fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />}
            {particle.icon === "sparkle" && <Sparkles size={18} className="text-primary fill-primary drop-shadow-[0_0_8px_rgba(29,185,84,0.6)]" />}
            {particle.icon === "heart" && <Heart size={18} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />}
          </div>
        ))}
      </div>

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
          className="ml-auto bg-primary text-primary-foreground font-bold text-xs h-9 active:scale-95 transition-transform"
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

      {/* Keyframe styles para la animación flotante */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0.6);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: var(--tw-translate, translate(var(--tw-translate-x), var(--tw-translate-y))) scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}
