import { Modal } from "@/components/Modal";

export function Confirm({
  open,
  title = "¿Confirmar eliminación?",
  message,
  confirmLabel = "Sí, eliminar",
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-5 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={pending}
          className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
