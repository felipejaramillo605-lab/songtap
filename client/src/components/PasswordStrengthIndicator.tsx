import React from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Vacía", color: "bg-muted" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: "Débil", color: "bg-red-500" };
    if (score <= 3) return { score: 2, label: "Media", color: "bg-yellow-500" };
    return { score: 3, label: "Fuerte", color: "bg-primary" };
  };

  const { score, label, color } = getStrength(password);

  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return (
    <div className="space-y-2 mt-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${color}`}
            style={{ width: `${(score / 3) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <ul className="text-[11px] text-muted-foreground space-y-0.5 grid grid-cols-2 gap-x-2">
        <li className={hasMinLength ? "text-primary font-medium" : ""}>
          ✓ Mínimo 6 caracteres
        </li>
        <li className={hasUppercase ? "text-primary font-medium" : ""}>
          ✓ Una mayúscula
        </li>
        <li className={hasNumber ? "text-primary font-medium" : ""}>
          ✓ Un número
        </li>
        <li className={hasSymbol ? "text-primary font-medium" : ""}>
          ✓ Un símbolo especial
        </li>
      </ul>
    </div>
  );
}
