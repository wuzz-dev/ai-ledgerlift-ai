import type { ExtractedInvoice, ProviderName } from "./types.js";

export type InvoicePromptInput = {
  text: string;
  fileName: string;
};

const providerFromEnv = (): ProviderName => {
  const requested = (process.env.AI_PROVIDER ?? "demo").toLowerCase();
  if (requested === "openai" || requested === "anthropic" || requested === "gemini") {
    return requested;
  }
  return "demo";
};

export const getActiveProvider = (): ProviderName => {
  const requested = providerFromEnv();
  if (requested === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (requested === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (requested === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  return "demo";
};

export async function extractWithConfiguredProvider(input: InvoicePromptInput): Promise<ExtractedInvoice | null> {
  const provider = getActiveProvider();
  if (provider === "demo") return null;

  const systemPrompt =
    "Extract an accounts payable invoice into strict JSON with vendorName, invoiceNumber, invoiceDate, dueDate, total, tax, currency, paymentTerms, poNumber, and lineItems. Return JSON only.";

  try {
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `File: ${input.fileName}\n\n${input.text}` }
          ]
        })
      });
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return parseInvoiceJson(json.choices?.[0]?.message?.content);
    }

    if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
          max_tokens: 1200,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: "user", content: `File: ${input.fileName}\n\n${input.text}` }]
        })
      });
      const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      return parseInvoiceJson(json.content?.find((part) => part.type === "text")?.text);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? "gemini-1.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
          contents: [{ parts: [{ text: `${systemPrompt}\n\nFile: ${input.fileName}\n\n${input.text}` }] }]
        })
      }
    );
    const json = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return parseInvoiceJson(json.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch {
    return null;
  }
}

function parseInvoiceJson(content?: string): ExtractedInvoice | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as ExtractedInvoice;
    if (!parsed.vendorName || !parsed.invoiceNumber || typeof parsed.total !== "number") {
      return null;
    }
    return {
      ...parsed,
      currency: parsed.currency || "USD",
      poNumber: parsed.poNumber ?? null,
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : []
    };
  } catch {
    return null;
  }
}
