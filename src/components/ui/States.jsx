import { AlertTriangle, Inbox, Loader2 } from "lucide-react"
import { Button } from "./Button"
import { cn } from "../../lib/utils"

export function LoadingState({ label = "Loading...", className }) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground", className)}
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-bold">{title}</p>
        {message && <p className="max-w-md text-sm text-muted-foreground">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon || <Inbox className="h-8 w-8" aria-hidden="true" />}
      </div>
      <div className="space-y-1">
        <p className="text-lg font-bold">{title}</p>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
