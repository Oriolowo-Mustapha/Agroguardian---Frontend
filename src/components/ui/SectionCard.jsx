import { cn } from "../../lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./Card"

/** Card with a wrapping header row: icon + title on the left, actions on the right. */
export function SectionCard({ title, icon, action, className, contentClassName, children }) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm", className)}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
              {icon}
            </span>
          )}
          <CardTitle className="truncate text-lg sm:text-xl">{title}</CardTitle>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent className={cn("p-4 sm:p-6", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

/** Compact stat tile: uppercase label, value, optional helper line. */
export function MiniStat({ label, value, icon, helper, className }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-muted/40 p-3 sm:p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && <span className="shrink-0 text-primary" aria-hidden="true">{icon}</span>}
      </div>
      <p className="mt-1 truncate text-base font-black sm:text-lg">{value}</p>
      {helper && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  )
}
