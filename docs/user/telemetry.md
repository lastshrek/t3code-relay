# Product usage data

In this customized build, product analytics are off by default. The server does not read T3 Connect,
Claude, or Codex account identifiers to create analytics identity. It also does not send client
account or device hashes with connection metadata. Product analytics run only if you explicitly set
`T3CODE_TELEMETRY_ENABLED=true`; when enabled, the server creates a random installation identifier
and sends product events to `ingest.t3.codes`, which forwards them to PostHog. Events can include
the provider, model, reasoning effort, permission mode, turn and request results, duration, release
channel, and token counts when available.

Product events do not include prompts, responses, file contents, authentication tokens, conversation IDs,
raw provider events, child-agent output, or identifiers from your provider accounts. The one exception is [agent feedback](#agent-feedback),
which is off unless you turn it on.

## Agent feedback

Agent feedback lets agents tell the T3 team about T3 Code: a T3 tool or `t3` command that did not
do what they expected, a confusing instruction, or a missing capability. Choose a mode in
**Agent feedback** in **Settings > Labs**:

- **Off**, the default: agents do not see the feedback tools, and `t3 feedback` stops with a
  message pointing to Labs.
- **When I ask**: agents send a report only when you ask them to, about anything in T3 Code.
- **Automatic**: agents also report T3 Code problems they hit on their own, such as a T3 tool that
  failed and made them find another way. These go out without asking you, so they carry only the
  kind of problem and the tool or command it concerns, with no agent-written text, outline, or
  conversation. `t3 feedback --kind bug --subject "t3 thread send" --expected "…" --actual "…"`
  sends one the same way, so it works only in this mode.

When you ask your agent for a report, in either mode, T3 Code shows it in the thread as a card
with exactly what would leave your machine, and sends it only if you press **Send**. The agent
carries on without waiting and never learns your answer. The card stays open until you answer it,
even after the turn ends or the server restarts; **Don't send** sends nothing, and the agent is
told not to send it another way. Only someone who can run agents on that machine can answer the
card; people on a guest link cannot.

Each report has the kind of problem, the T3 tool or command it concerns (or `general`), and, when
you send it from a card, up to 300 characters each of expected behavior, actual behavior, and
workaround, written by the agent, which is told not to quote your messages or code. The agent also says how many recent turns the
problem spans. A report you approved carries an outline of those turns, and of at least the last 5,
from when the agent asked: who spoke, how long each message was, and which tools ran, whether they
worked, and how long they took. The outline has no text. Tools from your other MCP servers appear
only as `mcp`. Turn on **Include the conversation** in the card to attach the text of your
messages and the agent's replies in the turns the problem spans, up to 1,000 characters per
message and 16 KB in all, oldest text dropped first; the card shows that text before you send it.
To change a report, such as the turns it covers, ask the agent in the chat: it shows a new card,
and you can decline the old one. Tool inputs and outputs, files, and attachments are never sent. An agent can
show you at most 3 report cards and send 3 reports on its own per turn, and `t3 feedback` can
send at most 10 an hour.

Before anything is saved, T3 Code removes file paths (when text mentions one, the rest of that line
goes with it), your user name, machine name, project title, branch, and git remote, and anything
that looks like a key, token, email address, or URL with a password. It cannot recognise your code
or a name written in a sentence, so only include the conversation when it holds nothing you would
not send. Reports from agents also name the provider and the model. No thread IDs or project IDs
are sent, and each report goes out under its own random ID, so reports cannot be tied to your
installation or to each other.

Reports are saved on your machine first, and a declined one is not saved at all; its card keeps
only what you would have sent without the conversation. When product usage
data is turned off, saved reports stay there and are not sent. `t3 feedback list` shows recent
reports, the thread each came from, and a line for each outline; `t3 feedback list --json` shows
exactly what each one holds.

## Relay connection diagnostics

T3 Code sends relay connection traces to Axiom to diagnose T3 Connect connectivity. These are
separate from product events. Traces carry connection timings, request paths, environment and
thread identifiers, and error types. They omit machine addresses, query strings, log lines,
error messages, and stack frames.

Product events and relay tracing are off by default in this customized build. Relay tracing must be
explicitly enabled with `T3CODE_TELEMETRY_ENABLED=true` and a configured trace destination. Setting
`T3CODE_TELEMETRY_ENABLED=false` disables both. OpenTelemetry SDK disable settings also stop traces.

An administrator can turn product events and relay tracing off in the server and desktop app with
a [managed policy](./managed-policy.md#other-capabilities). This does not control traces sent by
the hosted web app or mobile clients.

The desktop app reads `T3CODE_TELEMETRY_ENABLED` from your shell profile (for example `~/.zshrc`) on macOS and
Linux, so export it there and restart the app. On Windows, set it as a user environment variable.

A browser opened from a T3 Code server sends relay traces only while connected and allowed by that
server's policy. Browser relay traces are off unless the server explicitly allows them. Hosted web
relay traces are also off unless the client is explicitly allowed and configured.

## Mobile app diagnostics

Mobile crash reports are off by default. When explicitly enabled, an iOS or Android crash or error
sends a report to T3 Code: the error
message, the stack trace, the app version, and the device model and OS version. Each launch also
sends startup timings, and every report carries a random ID for the install. Reports go through
the T3 Connect relay to Axiom. They do not include your threads, prompts, or connection details,
but an error message can quote a value the app was handling.

Turn on **Send crash reports** in **Settings > About T3 Code > Diagnostics** to enable them.

Mobile relay connection traces are off by default. When explicitly enabled and configured, these
carry an identifier for the current app session. Enable them with **Send connection traces** in
**Settings > About T3 Code > Diagnostics**, or on the T3 Connect setup sheet shown after you sign
in. This is separate from crash reports. Server environment variables and managed policy do not
control mobile tracing.

## Agent activity for mobile notifications

When **Publish agent activity** is enabled on a host, it sends project and thread titles, model
names, activity status, and environment and thread identifiers to the T3 Connect relay for
[mobile notifications and live activities](./mobile-notifications.md). This is separate from
product events and relay diagnostics. The telemetry opt-out does not disable it.

To stop publishing, turn off **Publish agent activity** under **Settings > Sharing & access** on
the host. Turning off notifications on a phone controls that phone's alerts, not the host's
publishing setting.

## Export diagnostics to your own receiver

To send traces, metrics, or logs to an OpenTelemetry receiver, open
**Settings > Maintenance > Diagnostics**, select an environment, and enter each signal's OTLP HTTP
endpoint under **OpenTelemetry export** (for example `http://localhost:4318/v1/traces`). Save, then
restart that environment's server. The receiver must be reachable from the server's machine.
**Test** sends an empty export from the server to check an endpoint before or after you save it;
saved endpoints are checked when the section opens. Checks send authentication headers only to
the signal's currently running endpoint and do not follow redirects. To check a new endpoint
that requires authentication, save it and restart the server first.

`T3CODE_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` environment variables override the saved
settings. An overridden signal shows **Set by environment** and names the variable that set it, and its
**Test** checks the running endpoint instead of the field. For endpoints saved here or set with `T3CODE_OTLP_*_URL`, set `T3CODE_OTLP_HEADERS` for
receivers that need authentication and `T3CODE_OTLP_PROTOCOL=http/protobuf` for receivers that do
not accept JSON. An endpoint set with `OTEL_EXPORTER_OTLP_*` takes its headers and protocol from
`OTEL_EXPORTER_OTLP_HEADERS` and `OTEL_EXPORTER_OTLP_PROTOCOL` instead.
