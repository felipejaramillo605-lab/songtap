// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManagerActivities from "./manager/ManagerActivities";
import StaffActivities from "./staff/StaffActivities";

const mocks = vi.hoisted(() => ({
  role: "manager" as "manager" | "staff",
  createActivity: vi.fn(),
  updateActivity: vi.fn(),
  uploadEvidence: vi.fn(),
  invalidate: vi.fn(),
  selectValue: undefined as ((value: string) => void) | undefined,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 601, role: mocks.role, venueId: 30001, name: "Usuario de prueba" },
    isAuthenticated: true,
    loading: false,
  }),
}));

vi.mock("wouter", () => ({ useLocation: () => ["/activities", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: { onValueChange: (value: string) => void; children: React.ReactNode }) => {
    mocks.selectValue = onValueChange;
    return <div>{children}</div>;
  },
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <button type="button" onClick={() => mocks.selectValue?.(value)}>{children}</button>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ activities: { listByVenue: { invalidate: mocks.invalidate }, myActivities: { invalidate: mocks.invalidate } } }),
    users: { list: { useQuery: () => ({ data: [{ id: 701, venueId: 30001, role: "staff", name: "Laura Staff" }] }) } },
    activities: {
      listByVenue: { useQuery: () => ({ data: [], isLoading: false }) },
      create: { useMutation: () => ({ mutate: mocks.createActivity, isPending: false }) },
      myActivities: { useQuery: () => ({ data: [{ id: 702, title: "Revisar inventario", description: "Contar bebidas", status: "pending", completionComment: null, evidenceImageUrl: null, updatedAt: new Date() }], isLoading: false }) },
      updateMyStatus: { useMutation: () => ({ mutate: mocks.updateActivity, isPending: false }) },
    },
    upload: { uploadFile: { useMutation: () => ({ mutateAsync: mocks.uploadEvidence }) } },
  },
}));

describe("botones críticos de actividades", () => {
  beforeEach(() => {
    mocks.role = "manager";
    mocks.createActivity.mockReset();
    mocks.updateActivity.mockReset();
    mocks.invalidate.mockReset();
    mocks.selectValue = undefined;
    mocks.uploadEvidence.mockReset().mockResolvedValue({ url: "https://storage.example.com/evidence.png" });
  });

  it("permite a un Manager abrir la asignación y enviar la actividad al Staff de su local", async () => {
    const user = userEvent.setup();
    render(<ManagerActivities />);

    await user.click(screen.getByRole("button", { name: /^asignar actividad$/i }));
    await user.click(screen.getByRole("button", { name: "Laura Staff" }));
    await user.type(screen.getByLabelText("Actividad"), "Verificar inventario nocturno");
    await user.type(screen.getByLabelText("Instrucciones"), "Contar bebidas y registrar novedades.");
    await user.click(screen.getAllByRole("button", { name: /^asignar actividad$/i }).at(-1)!);

    expect(mocks.createActivity).toHaveBeenCalledWith({
      venueId: 30001,
      assignedToUserId: 701,
      title: "Verificar inventario nocturno",
      description: "Contar bebidas y registrar novedades.",
    });
  });

  it("permite a un Staff cambiar estado, adjuntar evidencia y guardar el reporte", async () => {
    mocks.role = "staff";
    const user = userEvent.setup();
    render(<StaffActivities />);

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await user.click(screen.getByRole("button", { name: "Realizada" }));
    await user.type(screen.getByLabelText("Comentarios"), "Inventario cerrado sin diferencias.");
    const evidence = new File(["evidencia"], "inventario.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Imagen de evidencia"), evidence);
    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Guardar actualización" }));

    expect(mocks.updateActivity).toHaveBeenCalledWith({
      activityId: 702,
      status: "completed",
      completionComment: "Inventario cerrado sin diferencias.",
      evidenceImageUrl: "https://storage.example.com/evidence.png",
    });
  });
});
