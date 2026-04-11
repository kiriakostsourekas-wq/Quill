export default function AppMockup() {
  return (
    <section className="pb-20 md:pb-28 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-4 text-xs text-muted-foreground">app.quill.so</span>
          </div>
          <img
            src="https://storage.db.io/apps/e64ab6eb-7d2e-4edd-9024-9e22f8d72c60/images/img_3863998f158d.png"
            alt="Quill app editor showing a post draft with Voice DNA score panel"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
