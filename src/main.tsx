import React from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  FileCheck2,
  FileSearch,
  Gauge,
  History,
  LockKeyhole,
  Play,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UploadCloud,
  Webhook
} from "lucide-react";
import "./styles.css";

type InvoiceRun = {
  id: string;
  status: "approved" | "needs_review" | "rejected";
  confidence: number;
  provider: string;
  extracted: {
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    total: number;
    tax: number;
    currency: string;
    paymentTerms: string;
    poNumber: string | null;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  };
  validation: {
    duplicate: boolean;
    poMismatch: boolean;
    totalMismatch: boolean;
    missingFields: string[];
    anomalyFlags: Array<{ severity: "low" | "medium" | "high"; code: string; message: string }>;
  };
  auditTrail: Array<{ at: string; actor: string; action: string; details: string }>;
  usage: {
    creditsUsed: number;
    estimatedAiCostUsd: number;
    timeSavedMinutes: number;
  };
  exportPayload: Record<string, unknown>;
};

const invoiceSamples = [
  {
    label: "Clean PO match",
    fileName: "northstar-invoice.txt",
    uploadedBy: "ap.manager@northstar.demo",
    text: `Vendor: Northstar Office Supply
Invoice #: INV-44821
Invoice date: 2026-06-10
Due date: 2026-07-10
PO: PO-10045
Payment terms: Net 30
Line items:
- Printer paper, 14 boxes x 42.00 = 588.00
- Toner cartridges, 6 x 126.00 = 756.00
Tax: 107.52
Total: 1451.52`
  },
  {
    label: "Controller review",
    fileName: "bayline-freight.txt",
    uploadedBy: "ap.ops@bayline.demo",
    text: `Vendor: Bayline Logistics
Invoice #: BL-90311
Invoice date: 2026-06-12
Due date: 2026-06-20
PO: PO-77820
Payment terms: Net 7
Line items:
- Expedited freight, 1 x 8940.00 = 8940.00
Tax: 0.00
Total: 8940.00`
  },
  {
    label: "Duplicate risk",
    fileName: "apex-facilities.txt",
    uploadedBy: "controller@apex.demo",
    text: `Vendor: Apex Facilities
Invoice #: APX-7714
Invoice date: 2026-06-08
Due date: 2026-07-08
PO: PO-88410
Payment terms: Net 30
Line items:
- HVAC service visit, 1 x 2320.18 = 2320.18
Tax: 0.00
Total: 2320.18`
  }
];

const approvalQueue = [
  { vendor: "Northstar Office Supply", invoice: "INV-44821", amount: "$1,451.52", state: "Ready", owner: "AP lead" },
  { vendor: "Bayline Logistics", invoice: "BL-90311", amount: "$8,940.00", state: "Review", owner: "Controller" },
  { vendor: "Apex Facilities", invoice: "APX-7714", amount: "$2,320.18", state: "Blocked", owner: "AP analyst" }
];

const metricCards = [
  { label: "Invoices this month", value: "1,284", detail: "91.4% auto-routed", icon: ReceiptText },
  { label: "Exception queue", value: "37", detail: "12 high priority", icon: BellRing },
  { label: "Estimated AI spend", value: "$27.14", detail: "$0.021 per invoice", icon: Coins },
  { label: "Time returned", value: "386h", detail: "Month-to-date", icon: Clock3 }
];

const plans = [
  { name: "Starter", price: "$99", volume: "500 invoices", note: "For small bookkeeping teams" },
  { name: "Growth", price: "$299", volume: "2,500 invoices", note: "Approval routing and webhooks" },
  { name: "Firm", price: "$799", volume: "10,000 invoices", note: "Audit packs and vendor rules" }
];

function App() {
  const [selectedSample, setSelectedSample] = React.useState(0);
  const [invoiceText, setInvoiceText] = React.useState(invoiceSamples[0].text);
  const [uploadedBy, setUploadedBy] = React.useState(invoiceSamples[0].uploadedBy);
  const [fileName, setFileName] = React.useState(invoiceSamples[0].fileName);
  const [monthlyInvoices, setMonthlyInvoices] = React.useState(1200);
  const [minutesPerInvoice, setMinutesPerInvoice] = React.useState(12);
  const [hourlyCost, setHourlyCost] = React.useState(42);
  const [run, setRun] = React.useState<InvoiceRun | null>(null);
  const [runs, setRuns] = React.useState<InvoiceRun[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const savings = React.useMemo(() => {
    const hours = Math.round((monthlyInvoices * minutesPerInvoice * 0.68) / 60);
    const value = hours * hourlyCost;
    const plan = monthlyInvoices <= 500 ? 99 : monthlyInvoices <= 2500 ? 299 : 799;
    return { hours, value, net: value - plan, plan };
  }, [hourlyCost, minutesPerInvoice, monthlyInvoices]);

  function chooseSample(index: number) {
    const sample = invoiceSamples[index];
    setSelectedSample(index);
    setInvoiceText(sample.text);
    setUploadedBy(sample.uploadedBy);
    setFileName(sample.fileName);
    setError("");
  }

  async function submitRun(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/runs/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, text: invoiceText, uploadedBy })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? `Run failed with ${response.status}`);
      }
      const nextRun = payload as InvoiceRun;
      setRun(nextRun);
      setRuns((current) => [nextRun, ...current].slice(0, 6));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invoice run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ReceiptText size={22} aria-hidden="true" />
          <div>
            <strong>LedgerLift</strong>
            <span>AP control desk</span>
          </div>
        </div>
        <nav aria-label="Workspace">
          {[
            ["Intake", UploadCloud],
            ["Exceptions", AlertTriangle],
            ["Exports", Webhook],
            ["Rules", Settings2]
          ].map(([label, Icon]) => (
            <a href={`#${String(label).toLowerCase()}`} key={String(label)}>
              {React.createElement(Icon as typeof UploadCloud, { size: 17, "aria-hidden": true })}
              {String(label)}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Demo mode keeps all invoice data local unless provider keys are added.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Finance automation</p>
            <h1>Invoice intake, validation, and approval routing</h1>
          </div>
          <button className="primary-action" onClick={() => void submitRun()} disabled={loading}>
            <Play size={17} aria-hidden="true" />
            {loading ? "Running" : "Run sample"}
          </button>
        </header>

        <section className="metric-grid" aria-label="Portfolio metrics">
          {metricCards.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <metric.icon size={19} aria-hidden="true" />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className="workbench" id="intake">
          <form className="panel intake-panel" onSubmit={(event) => void submitRun(event)}>
            <div className="panel-header">
              <div>
                <p>Intake simulator</p>
                <h2>Paste an invoice or choose a realistic sample</h2>
              </div>
              <BadgeCheck size={20} aria-hidden="true" />
            </div>

            <div className="sample-tabs" role="tablist" aria-label="Invoice samples">
              {invoiceSamples.map((sample, index) => (
                <button className={selectedSample === index ? "active" : ""} type="button" key={sample.label} onClick={() => chooseSample(index)}>
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="field-row">
              <label>
                File name
                <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
              </label>
              <label>
                Uploaded by
                <input value={uploadedBy} onChange={(event) => setUploadedBy(event.target.value)} />
              </label>
            </div>
            <label>
              Invoice text
              <textarea value={invoiceText} onChange={(event) => setInvoiceText(event.target.value)} />
            </label>
            {error ? <p className="error-line">{error}</p> : null}
            <button className="primary-action wide" disabled={loading}>
              {loading ? "Processing invoice" : "Extract and validate invoice"}
            </button>
          </form>

          <section className="panel output-panel">
            <div className="panel-header">
              <div>
                <p>Review output</p>
                <h2>{run ? run.extracted.invoiceNumber : "No run selected"}</h2>
              </div>
              <FileSearch size={20} aria-hidden="true" />
            </div>

            {run ? (
              <div className="output-stack">
                <div className={`status-banner ${run.status}`}>
                  <strong>{run.status.replace("_", " ")}</strong>
                  <span>{Math.round(run.confidence * 100)}% confidence</span>
                </div>

                <dl className="facts-grid">
                  <div>
                    <dt>Vendor</dt>
                    <dd>{run.extracted.vendorName}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>
                      {run.extracted.currency} {run.extracted.total.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>PO</dt>
                    <dd>{run.extracted.poNumber ?? "Missing"}</dd>
                  </div>
                  <div>
                    <dt>Terms</dt>
                    <dd>{run.extracted.paymentTerms}</dd>
                  </div>
                </dl>

                <div className="flag-list">
                  {run.validation.anomalyFlags.length ? (
                    run.validation.anomalyFlags.map((flag) => (
                      <span className={`flag ${flag.severity}`} key={flag.code}>
                        {flag.message}
                      </span>
                    ))
                  ) : (
                    <span className="flag low">No blocking anomalies</span>
                  )}
                </div>

                <div className="audit-list">
                  {run.auditTrail.slice(0, 4).map((entry) => (
                    <p key={`${entry.at}-${entry.action}`}>
                      <strong>{entry.action.replaceAll("_", " ")}</strong>
                      <span>{entry.details}</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FileCheck2 size={34} aria-hidden="true" />
                <p>Run an invoice to see extracted fields, exception reasons, audit events, and export payload readiness.</p>
              </div>
            )}
          </section>
        </section>

        <section className="two-column" id="exceptions">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p>Exception queue</p>
                <h2>What needs human attention</h2>
              </div>
              <BellRing size={20} aria-hidden="true" />
            </div>
            <div className="queue-list">
              {approvalQueue.map((item) => (
                <article className="queue-row" key={item.invoice}>
                  <div>
                    <strong>{item.vendor}</strong>
                    <span>
                      {item.invoice} · {item.amount}
                    </span>
                  </div>
                  <div>
                    <em className={item.state.toLowerCase()}>{item.state}</em>
                    <small>{item.owner}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" id="exports">
            <div className="panel-header">
              <div>
                <p>Export controls</p>
                <h2>Accounting handoff</h2>
              </div>
              <Webhook size={20} aria-hidden="true" />
            </div>
            <div className="settings-list">
              <p>
                <span>Destination</span>
                <strong>QuickBooks / NetSuite payload</strong>
              </p>
              <p>
                <span>Webhook</span>
                <strong>Signed JSON after approval</strong>
              </p>
              <p>
                <span>Approval guardrail</span>
                <strong>Hold duplicates and PO mismatches</strong>
              </p>
            </div>
          </section>
        </section>

        <section className="two-column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p>ROI model</p>
                <h2>Volume-based savings</h2>
              </div>
              <Gauge size={20} aria-hidden="true" />
            </div>
            <div className="calculator-grid">
              <label>
                Monthly invoices
                <input type="number" value={monthlyInvoices} min={50} onChange={(event) => setMonthlyInvoices(Number(event.target.value))} />
              </label>
              <label>
                Minutes per invoice today
                <input type="number" value={minutesPerInvoice} min={2} onChange={(event) => setMinutesPerInvoice(Number(event.target.value))} />
              </label>
              <label>
                Loaded hourly cost
                <input type="number" value={hourlyCost} min={20} onChange={(event) => setHourlyCost(Number(event.target.value))} />
              </label>
            </div>
            <div className="roi-result">
              <strong>${savings.net.toLocaleString()}</strong>
              <span>estimated monthly net savings after a ${savings.plan}/mo plan</span>
            </div>
          </section>

          <section className="panel" id="rules">
            <div className="panel-header">
              <div>
                <p>Rules</p>
                <h2>Review policy</h2>
              </div>
              <LockKeyhole size={20} aria-hidden="true" />
            </div>
            <div className="rule-list">
              {[
                "Route invoices above $5,000 to Controller",
                "Reject known duplicate invoice IDs",
                "Flag payment terms shorter than Net 15",
                "Require PO review when vendor rules disagree"
              ].map((rule) => (
                <p key={rule}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {rule}
                </p>
              ))}
            </div>
          </section>
        </section>

        <section className="panel pricing-panel">
          <div className="panel-header">
            <div>
              <p>Commercial model</p>
              <h2>Simple invoice-credit plans</h2>
            </div>
            <Coins size={20} aria-hidden="true" />
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article key={plan.name}>
                <span>{plan.name}</span>
                <strong>{plan.price}<small>/mo</small></strong>
                <p>{plan.volume}</p>
                <em>{plan.note}</em>
              </article>
            ))}
          </div>
        </section>

        {runs.length ? (
          <section className="panel history-panel">
            <div className="panel-header">
              <div>
                <p>Run history</p>
                <h2>Recent automation runs</h2>
              </div>
              <History size={20} aria-hidden="true" />
            </div>
            <div className="history-list">
              {runs.map((item) => (
                <button type="button" key={item.id} onClick={() => setRun(item)}>
                  <span>{item.extracted.invoiceNumber}</span>
                  <strong>{item.extracted.vendorName}</strong>
                  <em>{item.status.replace("_", " ")}</em>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
