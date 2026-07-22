// Imperative, promise-based replacements for window.alert/confirm/prompt.
// Native browser dialogs can't be styled or centered consistently (they
// anchor to the browser chrome, not the viewport) — these route through a
// single <DialogHost/> mounted once in the root layout, rendered as a
// centered in-app modal on both mobile and desktop.

export type DialogRequest =
  | { kind: 'confirm'; message: string; title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; resolve: (v: boolean) => void }
  | { kind: 'prompt'; message: string; defaultValue: string; placeholder?: string; confirmLabel?: string; resolve: (v: string | null) => void }
  | { kind: 'alert'; message: string; title?: string; okLabel?: string; resolve: () => void }

let listener: ((req: DialogRequest) => void) | null = null

export function registerDialogListener(fn: ((req: DialogRequest) => void) | null) {
  listener = fn
}

export function confirmDialog(message: string, opts?: { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise(resolve => {
    if (!listener) { resolve(window.confirm(message)); return }
    listener({ kind: 'confirm', message, resolve, ...opts })
  })
}

export function promptDialog(message: string, defaultValue = '', opts?: { placeholder?: string; confirmLabel?: string }): Promise<string | null> {
  return new Promise(resolve => {
    if (!listener) { resolve(window.prompt(message, defaultValue)); return }
    listener({ kind: 'prompt', message, defaultValue, resolve, ...opts })
  })
}

export function alertDialog(message: string, opts?: { title?: string; okLabel?: string }): Promise<void> {
  return new Promise(resolve => {
    if (!listener) { window.alert(message); resolve(); return }
    listener({ kind: 'alert', message, resolve, ...opts })
  })
}
