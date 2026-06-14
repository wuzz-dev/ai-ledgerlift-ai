export type ProviderName = "demo" | "openai" | "anthropic" | "gemini";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ExtractedInvoice = {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  tax: number;
  currency: string;
  paymentTerms: string;
  poNumber: string | null;
  lineItems: InvoiceLineItem[];
};

export type AnomalyFlag = {
  severity: "low" | "medium" | "high";
  code: string;
  message: string;
};

export type InvoiceValidation = {
  duplicate: boolean;
  poMismatch: boolean;
  totalMismatch: boolean;
  missingFields: string[];
  anomalyFlags: AnomalyFlag[];
};

export type AuditEvent = {
  at: string;
  actor: string;
  action: string;
  details: string;
};

export type InvoiceRunResult = {
  id: string;
  status: "approved" | "needs_review" | "rejected";
  confidence: number;
  provider: ProviderName;
  extracted: ExtractedInvoice;
  validation: InvoiceValidation;
  auditTrail: AuditEvent[];
  usage: {
    creditsUsed: number;
    estimatedAiCostUsd: number;
    timeSavedMinutes: number;
  };
  exportPayload: Record<string, unknown>;
};
