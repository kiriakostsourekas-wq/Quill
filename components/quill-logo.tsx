import { Feather } from "lucide-react";

export function QuillLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
        <Feather className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight text-ink">Quill</p>
        <p className="text-xs text-muted">Voice-aware publishing</p>
      </div>
    </div>
  );
}
