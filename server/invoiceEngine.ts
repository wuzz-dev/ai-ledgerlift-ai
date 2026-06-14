import { z } from "zod";
import { extractWithConfiguredProvider, getActiveProvider } from "./aiProvider.js";
import type { AnomalyFlag, AuditEvent, ExtractedInvoice, InvoiceRunResult, InvoiceValidation } from "./types.js";

export const invoiceRunSchema = z.object({
  text: z.string().min(20, "Invoice text must include at least 20 characters"),
  fileName: z.string().min(1).default("invoice.txt"),
  uploadedBy: z.string().email().default("demo@ledgerlift.ai"),
  vendorHint: z.string().optional(),
  amountHint: z.number().optional()
});

const knownInvoices = new Set(["APX-7714", "BL-90218", "DUP-1001"]);
const approvedPoByVendor: Record<string, string[]> = {
  "Northstar Office Supply": ["PO-10045", "PO-10046"],
  "Bayline Logistics": ["PO-77820"],
  "Apex Facilities": ["PO-88410"]
};

export async function runInvoiceAutomation(input: z.infer<typeof invoiceRunSchema>): Promise<InvoiceRunResult> {
  const startedAt = new Date();
  const audit: AuditEvent[] = [
    auditEvent(startedAt, input.uploadedBy, "intake_received", `Received ${input.fileName} for AP extraction.`)
  ];

  const providerResult = await extractWithConfiguredProvider({ text: input.text, fileName: input.fileName });
  const extracted = providerResult ?? deterministicExtraction(input.text, input.vendorHint, input.amountHint);
  const provider = providerResult ? getActiveProvider() : "demo";
  audit.push(auditEvent(new Date(), "ledgerlift-ai", "structured_extraction", `Parsed ${extracted.lineItems.length} line items using ${provider} mode.`));

  const validation = validateInvoice(extracted);
  audit.push(
    auditEvent(
      new Date(),
      "ledgerlift-ai",
      "validation_complete",
      validation.anomalyFlags.length ? `${validation.anomalyFlags.length} anomaly flag(s) created.` : "No blocking anomalies detected."
    )
  );

  const status = statusFromValidation(validation);
  audit.push(auditEvent(new Date(), "approval-router", "approval_route", routeDetails(status, extracted.total)));

  return {
    id: `run_${startedAt.getTime().toString(36)}`,
    status,
    confidence: confidenceFromValidation(validation, providerResult !== null),
    provider,
    extracted,
    validation,
    auditTrail: audit,
    usage: {
      creditsUsed: 1,
      estimatedAiCostUsd: provider === "demo" ? 0 : Number((0.006 + input.text.length * 0.0000025).toFixed(4)),
      timeSavedMinutes: Math.max(10, Math.min(26, Math.round(input.text.length / 34)))
    },
    exportPayload: {
      accountingSystem: "quickbooks_or_netSuite_placeholder",
      vendor: extracted.vendorName,
      invoiceNumber: extracted.invoiceNumber,
      total: extracted.total,
      currency: extracted.currency,
      dueDate: extracted.dueDate,
      poNumber: extracted.poNumber,
      status,
      lineItems: extracted.lineItems,
      validationFlags: validation.anomalyFlags.map((flag) => flag.code)
    }
  };
}

function deterministicExtraction(text: string, vendorHint?: string, amountHint?: number): ExtractedInvoice {
  const vendorName =
    vendorHint ||
    pickKnownVendor(text) ||
    matchValue(text, /vendor\s*:?\s*([^\n]+)/i) ||
    matchValue(text, /from\s*:?\s*([^\n]+)/i) ||
    "Northstar Office Supply";
  const invoiceNumber = matchValue(text, /(?:invoice\s*(?:#|number|no\.?)?|inv)\s*:?\s*([A-Z0-9-]+)/i) || "INV-44821";
  const invoiceDate = matchValue(text, /invoice date\s*:?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i) || "2026-06-10";
  const dueDate = matchValue(text, /due date\s*:?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i) || "2026-07-10";
  const poNumber = matchValue(text, /\b(PO-\d{4,8})\b/i);
  const tax = numericMatch(text, /tax\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i) ?? 107.52;
  const total = amountHint ?? numericMatch(text, /total\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i) ?? 1451.52;
  const paymentTerms = matchValue(text, /payment terms\s*:?\s*([^\n]+)/i) || matchValue(text, /\b(Net\s*\d{1,3})\b/i) || "Net 30";
  const lineItems = parseLineItems(text);

  return {
    vendorName: clean(vendorName),
    invoiceNumber: invoiceNumber.toUpperCase(),
    invoiceDate,
    dueDate,
    total,
    tax,
    currency: text.match(/\b(EUR|GBP|SGD|USD)\b/i)?.[1]?.toUpperCase() ?? "USD",
    paymentTerms: clean(paymentTerms),
    poNumber: poNumber?.toUpperCase() ?? null,
    lineItems: lineItems.length
      ? lineItems
      : [
          { description: "Printer paper", quantity: 14, unitPrice: 42, amount: 588 },
          { description: "Toner cartridges", quantity: 6, unitPrice: 126, amount: 756 }
        ]
  };
}

function validateInvoice(invoice: ExtractedInvoice): InvoiceValidation {
  const missingFields = [
    ["vendorName", invoice.vendorName],
    ["invoiceNumber", invoice.invoiceNumber],
    ["invoiceDate", invoice.invoiceDate],
    ["dueDate", invoice.dueDate],
    ["total", invoice.total],
    ["paymentTerms", invoice.paymentTerms]
  ]
    .filter(([, value]) => value === null || value === undefined || value === "")
    .map(([field]) => String(field));

  const duplicate = knownInvoices.has(invoice.invoiceNumber);
  const approvedPoList = approvedPoByVendor[invoice.vendorName] ?? [];
  const poMismatch = Boolean(invoice.poNumber && approvedPoList.length && !approvedPoList.includes(invoice.poNumber));
  const lineSubtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalMismatch = lineSubtotal > 0 && Math.abs(lineSubtotal + invoice.tax - invoice.total) > 0.05;
  const anomalyFlags: AnomalyFlag[] = [];

  if (duplicate) {
    anomalyFlags.push({ severity: "high", code: "duplicate_invoice", message: "Duplicate invoice number detected" });
  }

  if (poMismatch) {
    anomalyFlags.push({ severity: "high", code: "po_mismatch", message: "PO does not match vendor approval list" });
  }

  if (totalMismatch) {
    anomalyFlags.push({ severity: "medium", code: "total_mismatch", message: "Line subtotal plus tax does not equal invoice total" });
  }

  if (missingFields.length) {
    anomalyFlags.push({ severity: "medium", code: "missing_fields", message: `Missing required fields: ${missingFields.join(", ")}` });
  }

  const termsDays = Number(invoice.paymentTerms.match(/\d+/)?.[0] ?? 30);
  if (termsDays < 15) {
    anomalyFlags.push({ severity: "medium", code: "short_payment_terms", message: "Payment terms are shorter than policy" });
  }

  if (invoice.total > 5000) {
    anomalyFlags.push({ severity: "low", code: "high_value_invoice", message: "Invoice exceeds controller review threshold" });
  }

  if (!invoice.poNumber) {
    anomalyFlags.push({ severity: "low", code: "missing_po", message: "No PO number found" });
  }

  return { duplicate, poMismatch, totalMismatch, missingFields, anomalyFlags };
}

function statusFromValidation(validation: InvoiceValidation): InvoiceRunResult["status"] {
  if (validation.anomalyFlags.some((flag) => flag.severity === "high")) return "rejected";
  if (validation.anomalyFlags.length > 0) return "needs_review";
  return "approved";
}

function confidenceFromValidation(validation: InvoiceValidation, aiProviderUsed: boolean): number {
  const penalty = validation.anomalyFlags.reduce((score, flag) => score + (flag.severity === "high" ? 0.18 : flag.severity === "medium" ? 0.1 : 0.04), 0);
  const base = aiProviderUsed ? 0.93 : 0.88;
  return Number(Math.max(0.52, base - penalty).toFixed(2));
}

function routeDetails(status: InvoiceRunResult["status"], total: number) {
  if (status === "approved" && total <= 5000) return "Queued for AP lead approval and CSV export.";
  if (status === "rejected") return "Held for AP analyst because a blocking exception was found.";
  return "Routed to Controller queue with validation context.";
}

function auditEvent(at: Date, actor: string, action: string, details: string): AuditEvent {
  return { at: at.toISOString(), actor, action, details };
}

function pickKnownVendor(text: string) {
  return Object.keys(approvedPoByVendor).find((vendor) => text.toLowerCase().includes(vendor.toLowerCase()));
}

function matchValue(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim();
}

function numericMatch(text: string, pattern: RegExp) {
  const value = matchValue(text, pattern);
  return value ? Number(value.replace(/,/g, "")) : null;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseLineItems(text: string) {
  return [...text.matchAll(/-\s*([^,\n]+),?\s*(\d+(?:\.\d+)?)\s*(?:boxes\s*)?x\s*\$?([\d,]+(?:\.\d{2})?)\s*=\s*\$?([\d,]+(?:\.\d{2})?)/gi)].map(
    (match) => ({
      description: clean(match[1]),
      quantity: Number(match[2]),
      unitPrice: Number(match[3].replace(/,/g, "")),
      amount: Number(match[4].replace(/,/g, ""))
    })
  );
}
