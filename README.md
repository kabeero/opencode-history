# opencode-history

An [OpenCode](https://opencode.ai) TUI plugin that opens the current chat in your `$EDITOR`.

It works like the built-in "Open editor" (`<leader>e`), which opens your prompt, but for the whole conversation. You can browse and search the chat with your editor's own tools.

- Includes user and assistant text only. Reasoning and tool calls are left out.
- The chat is a temporary Markdown file. It is deleted when you close the editor.
- Read-only in effect: edits are not sent back to OpenCode.

## Install

Clone into OpenCode's global plugin directory. OpenCode discovers it automatically.

```sh
git clone https://github.com/kabeero/opencode-history ~/.config/opencode/plugins/edit-history
```

If you set `$XDG_CONFIG_HOME`, use `$XDG_CONFIG_HOME/opencode/plugins/edit-history` instead.

Then run `/reload` in OpenCode, or restart it. Confirm it loaded with `opencode plugin list`.

To update, `git pull` inside that folder and `/reload`. To remove, delete the folder.

## Usage

| Trigger | Action |
| --- | --- |
| `/history` | Open the current chat in your editor |
| Your leader key, then `Shift+E` (`<leader>shift+e`) | Same, default keybind |
| `Ctrl+P`, then "Open chat history in editor" | Same, from the command palette |

OpenCode suspends the TUI, runs `$VISUAL` (or `$EDITOR`) on the file, and resumes when the editor exits. GUI editors need a blocking flag, for example `export EDITOR="code --wait"`.

The file looks like this:

```markdown
# Session title

## You · 2026-11-11 14:02

How do I search my prompt history?

---

## Assistant · 2026-11-11 14:02

...
```

## Configure

The default bind is `<leader>shift+e`. OpenCode keybinds spell Shift out (`shift+e`) rather than using a capital letter. Change it with the plugin's `bind` option in `cli.json`:

```json
{
  "plugins": [
    {
      "package": "/path/to/opencode-history",
      "options": { "bind": "<leader>shift+h" }
    }
  ]
}
```

You can also bind the command from your own `keybinds` using its command ID, `history.open`.

## Requirements

- OpenCode V2 (TUI plugin API, `@opencode/plugin/tui`)
- `$VISUAL` or `$EDITOR` set in the environment OpenCode runs in

## License

[MIT](LICENSE)
