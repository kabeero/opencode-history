import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Plugin } from "@opencode/plugin/tui"

const DEFAULT_BIND = "<leader>shift+e"

function textOf(message: any): string {
  if (message.type === "user") return String(message.text ?? "").trim()
  if (message.type === "assistant") {
    return (message.content ?? [])
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n\n")
      .trim()
  }
  return ""
}

function whenOf(message: any): string {
  const created = message.time?.created
  if (typeof created !== "number") return ""
  const date = new Date(created)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function render(title: string | undefined, messages: any[]): string {
  const blocks = messages
    .map((message) => ({ message, text: textOf(message) }))
    .filter((entry) => entry.text)
    .map(({ message, text }) => {
      const role = message.type === "user" ? "You" : "Assistant"
      const when = whenOf(message)
      return `## ${role}${when ? ` · ${when}` : ""}\n\n${text}`
    })
  if (blocks.length === 0) return ""
  const heading = title ? `# ${title}\n\n` : ""
  return `${heading}${blocks.join("\n\n---\n\n")}\n`
}

async function loadAllMessages(context: any, sessionID: string): Promise<any[]> {
  const store = context.data.session.message
  await store.sync(sessionID)
  try {
    if (store.more?.(sessionID)) await store.loadMore?.(sessionID, { all: true })
  } catch {}
  return store.list(sessionID) ?? []
}

async function openInEditor(context: any, value: string, sessionID: string): Promise<boolean> {
  const editor = process.env.VISUAL || process.env.EDITOR
  if (!editor) return false

  const file = join(tmpdir(), `opencode-history-${sessionID}-${Date.now()}.md`)
  const directory = context.location?.directory
  const cwd = directory && existsSync(directory) ? directory : process.cwd()
  const renderer = context.renderer

  await writeFile(file, value)
  try {
    await renderer.suspend()
    try {
      const [command, ...args] = editor.trim().split(/\s+/)
      await new Promise<void>((resolve, reject) => {
        const child = spawn(command!, [...args, file], {
          cwd,
          stdio: "inherit",
          shell: process.platform === "win32",
        })
        child.on("error", reject)
        child.on("close", () => resolve())
      })
    } finally {
      await renderer.resume()
    }
  } finally {
    await rm(file, { force: true }).catch(() => {})
  }
  return true
}

export default Plugin.define({
  id: "history",
  setup(context: any) {
    const bind = typeof context.options?.bind === "string" ? context.options.bind : DEFAULT_BIND

    const run = async () => {
      const route: any = context.ui.router.current()
      const sessionID = route?.sessionID ?? route?.params?.sessionID
      if (!sessionID) {
        context.ui.toast.show({ variant: "warning", message: "Open a session first" })
        return
      }

      const messages = await loadAllMessages(context, sessionID)
      const markdown = render(context.data.session.get(sessionID)?.title, messages)
      if (!markdown) {
        context.ui.toast.show({ variant: "info", message: "No messages with text" })
        return
      }

      const opened = await openInEditor(context, markdown, sessionID)
      if (!opened) {
        context.ui.toast.show({ variant: "error", message: "Set $VISUAL or $EDITOR to open history" })
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "history.open",
          title: "Open chat history in editor",
          group: "Session",
          bind,
          palette: true,
          slash: { name: "history" },
          run: () =>
            void run().catch((error) =>
              context.ui.toast.show({
                variant: "error",
                message: `Open history failed: ${error instanceof Error ? error.message : String(error)}`,
              }),
            ),
        },
      ],
      bindings: ["history.open"],
    }))
  },
})
