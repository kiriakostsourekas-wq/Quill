import { Feather } from "lucide-react";

export function QuillLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-[#FFFFFF] text-brand shadow-sm">
        <Feather className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold tracking-[-0.03em] text-[#15161A]">Quill AI</p>
        <p className="text-xs text-muted">Voice-aware publishing</p>
      </div>
    </div>
  );
}
