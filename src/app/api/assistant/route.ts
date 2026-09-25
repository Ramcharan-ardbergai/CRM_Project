import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INSTRUCTIONS = `You are Focus AI, the assistant built into Focus CRM. You help sales reps, managers and support agents understand and act on their CRM data.

You receive a snapshot of the workspace's CRM data below: team, companies, contacts, deals, tasks, tickets and recent activities, plus precomputed totals. Answer only from that data. If something isn't in the snapshot, say so plainly instead of guessing. Use the precomputed totals when they answer the question rather than recomputing them.

How to answer:
- Lead with the answer, then the supporting detail. Keep it short: a few sentences or a short bullet list.
- Use Markdown: **bold** for key figures, "-" bullet lists, short "###" headings only when an answer has several parts. Do not use tables.
- Format money with the workspace currency symbol and thousands separators.
- Link records so the user can open them, using exactly these forms with the record's id from the snapshot:
  [Company name](/companies/<id>), [Contact name](/contacts/<id>), [Ticket subject](/tickets/<id>), [Deal name](deal:<id>).
- When asked what to do next, give concrete, prioritised actions (overdue tasks, deals past their close date, urgent tickets, stale deals with no recent activity).
- When asked to draft an email or message, write it ready to send.
- You cannot change data. If asked to create or update something, explain where in Focus CRM to do it (for example "+ New → Task", or the Pipeline board).`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const { messages, context } = (await req.json()) as { messages: ChatTurn[]; context: string };
  if (!Array.isArray(messages) || !messages.length || typeof context !== "string") {
    return Response.json({ error: "bad_request", message: "Expected messages and context." }, { status: 400 });
  }

  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return Response.json({ error: "not_configured", message: "No Anthropic credentials found on the server." }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({
          model: "claude-opus-5",
          max_tokens: 64000,
          output_config: { effort: "medium" },
          // Route policy declines to a fallback model instead of failing the turn.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [
            { type: "text", text: INSTRUCTIONS },
            { type: "text", text: `<crm_snapshot>\n${context}\n</crm_snapshot>`, cache_control: { type: "ephemeral" } },
          ],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\nI can't help with that request."));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_(Answer was cut short.)_"));
        }
        controller.close();
      } catch (err) {
        let message = "The assistant is unavailable right now.";
        if (err instanceof Anthropic.AuthenticationError) message = "__not_configured__";
        else if (err instanceof Anthropic.RateLimitError) message = "The assistant is busy (rate limited). Try again in a moment.";
        else if (err instanceof Anthropic.APIConnectionError) message = "Couldn't reach the Claude API. Check the server's internet connection.";
        else if (err instanceof Anthropic.APIError) message = `The assistant returned an error (${err.status}).`;
        // A client-side SDK error before any request (e.g. no credentials configured).
        else if (err instanceof Anthropic.AnthropicError) message = "__not_configured__";
        controller.enqueue(encoder.encode(`\u0000${message}`));
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
