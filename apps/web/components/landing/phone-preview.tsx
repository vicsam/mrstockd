export function PhonePreview() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[300px]">
      <div className="absolute -inset-3 rounded-[40px] bg-[var(--l-brand)] opacity-10 blur-2xl" aria-hidden />
      <div className="relative rounded-[36px] border-[10px] border-[#0d0c22] bg-[#0d0c22] p-2 shadow-[0_24px_48px_rgba(13,12,34,0.24)]">
        <div className="overflow-hidden rounded-[26px] bg-white">
          <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-[var(--l-muted)]">
            <span>9:41</span>
            <span>Illustrative preview</span>
          </div>
          <div className="flex flex-col gap-3 bg-[var(--l-canvas)] p-4">
            <div className="rounded-[16px] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-semibold text-[var(--l-ink)]">Hire an agent</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--l-inset)] px-2 py-1 text-[10px] text-[var(--l-nav)]">Summarise PDF</span>
                <span className="rounded-full bg-[var(--l-inset)] px-2 py-1 text-[10px] text-[var(--l-nav)]">Book meetings</span>
              </div>
            </div>
            <div className="rounded-[16px] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-semibold text-[var(--l-ink)]">Agent is working</p>
              <div className="mt-2 h-2 w-full rounded-full bg-[var(--l-inset)]">
                <div className="h-2 w-2/3 rounded-full bg-[var(--l-brand)]" />
              </div>
              <p className="mt-2 text-[11px] text-[var(--l-muted)]">read access only · needs approval to send</p>
            </div>
            <div className="rounded-[16px] border border-[var(--l-border)] bg-white p-3">
              <p className="text-[11px] font-semibold text-[var(--l-green)]">Payment via PayPal</p>
              <p className="text-[10px] text-[var(--l-muted)]">10% fee, only when you sell</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
