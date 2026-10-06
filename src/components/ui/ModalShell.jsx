import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Canonical modal shell: responsive padding, max-height + scrolling body,
 * Escape/overlay close, focus trap, focus restore, body scroll lock.
 */
export default function ModalShell({
  open,
  onClose,
  title,
  description,
  icon,
  size = "md",
  headerClassName,
  footer,
  bodyClassName,
  className,
  children,
}) {
  const panelRef = React.useRef(null)
  const previouslyFocused = React.useRef(null)
  const titleId = React.useId()

  React.useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement

    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    ;(first || panel)?.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== "Tab" || !panel) return
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "my-auto flex w-full flex-col overflow-hidden rounded-3xl bg-card shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200",
          SIZES[size],
          "max-h-[90dvh]",
          className
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-4 border-b border-border p-4 sm:p-6",
            headerClassName
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {icon && <span aria-hidden="true">{icon}</span>}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-bold leading-tight sm:text-xl">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm opacity-80">{description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-muted/50 p-4 sm:flex-row sm:justify-end sm:p-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
