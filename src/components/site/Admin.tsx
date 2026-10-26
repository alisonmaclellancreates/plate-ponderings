import { Plate } from "@/components/site/Plate";
import type { ReportedStory } from "@/lib/domain";
import { REPORT_REASON_OPTIONS } from "@/lib/report-reasons";
import { AiCheckStatus } from "./AiCheckStatus";
import type { ReactNode } from "react";

type Toggle = ((row: ReportedStory) => void) | undefined;

function ReportRow({
  row,
  onToggle,
  busy,
}: {
  row: ReportedStory;
  onToggle: Toggle;
  busy: boolean;
}) {
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <Plate jurisdiction={row.jurisdiction} text={row.text} size="sm" className="w-28" />
      </td>
      <td className="p-3 font-semibold">{row.handle}</td>
      <td className="p-3">{row.meaning}</td>
      <td className="p-3 text-center">{row.reports}</td>
      <td className="p-3">
        {row.reasons
          .map(
            (reason) =>
              REPORT_REASON_OPTIONS.find((option) => option.key === reason)?.label ?? reason,
          )
          .join(", ")}
      </td>
      <td className="p-3 capitalize">{row.status}</td>
      <td className="p-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle?.(row)}
          className="brand-btn brand-btn-outline"
        >
          {row.status === "visible" ? "Hide" : "Unhide"}
        </button>
      </td>
    </tr>
  );
}

export function AdminPage({
  rows = [],
  onToggle,
  onRecheck,
  busy = false,
  note = "",
  message = "",
  demoControls,
  aiStatus = <AiCheckStatus />,
}: {
  rows?: ReportedStory[];
  onToggle?: Toggle;
  onRecheck?: () => void;
  busy?: boolean;
  note?: string;
  message?: string;
  demoControls?: ReactNode;
  /** The AI check status panel; the live page loads it, the sample gallery passes a fixed one. */
  aiStatus?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl text-navy">Admin</h1>
      {aiStatus}
      {demoControls}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onRecheck}
          className="brand-btn brand-btn-navy"
        >
          Recheck pending
        </button>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {message && (
        <p role="alert" className="mt-4">
          {message}
        </p>
      )}
      <div data-testid="admin-table-scroll" className="brand-card mt-6 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <caption className="sr-only">Reported stories</caption>
          <thead>
            <tr className="text-navy">
              <th scope="col" className="p-3">
                Plate
              </th>
              <th scope="col" className="p-3">
                Handle
              </th>
              <th scope="col" className="p-3">
                Meaning
              </th>
              <th scope="col" className="p-3 text-center">
                Reports
              </th>
              <th scope="col" className="p-3">
                Reasons
              </th>
              <th scope="col" className="p-3">
                Status
              </th>
              <th scope="col" className="relative p-3">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ReportRow key={row.id} row={row} onToggle={onToggle} busy={busy} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
