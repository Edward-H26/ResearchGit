import type { TopicReport } from "@/components/v2/topic-canvas/report";

type TopicReportPanelProps = {
  report: TopicReport;
};

export function TopicReportPanel({ report }: TopicReportPanelProps) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_24px_80px_rgba(57,44,18,0.08)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
        AI synthesis
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Analysis report</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {(
          [
            ["Directions", report.directions],
            ["Threads", report.threads],
            ["Next steps", report.nextSteps],
          ] as const
        ).map(([label, items]) => (
          <section key={label} className="rounded-[22px] border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {label}
            </h3>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-neutral-700">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
