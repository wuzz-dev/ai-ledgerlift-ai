import React from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Check,
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
  Sparkles,
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

const sampleInvoice = `Vendor: Northstar Office Supply
Invoice #: INV-44821
Invoice date: 2026-06-10
Due date: 2026-07-10
PO: PO-10045
Payment terms: Net 30
Line items:
- Printer paper, 14 boxes x 42.00 = 588.00
- Toner cartridges, 6 x 126.00 = 756.00
Tax: 107.52
Total: 1451.52`;

const trustedBadges = ["SOC 2-ready audit logs", "Human approval checkpoints", "No training on customer invoices", "CSV and webhook export"];

const plans = [
  { name: "Starter", price: "$99", volume: "500 invoices", features: ["Smart intake queue", "Duplicate checks", "CSV export"] },
  { name: "Growth", price: "$299", volume: "2,500 invoices", features: ["PO mismatch routing", "Webhook export", "Team approvals"] },
  { name: "Firm", price: "$799", volume: "10,000 invoices", features: ["Audit export packs", "Custom vendor rules", "Priority support"] }
];

const historyRows = [
  { vendor: "Northstar Office Supply", invoice: "INV-44821", status: "Ready", cost: "$0.021", saved: "18m" },
  { vendor: "Bayline Logistics", invoice: "BL-90218", status: "Review", cost: "$0.018", saved: "14m" },
  { vendor: "Apex Facilities", invoice: "APX-7714", status: "Exception", cost: "$0.023", saved: "21m" }
];

const queueRows = [
  { vendor: "Northstar Office Supply", amount: "$1,451.52", flag: "Clean 3-way match", tone: "good" },
  { vendor: "Bayline Logistics", amount: "$8,940.00", flag: "Unusual freight terms", tone: "warn" },
  { vendor: "Apex Facilities", amount: "$2,320.18", flag: "Duplicate invoice ID", tone: "danger" }
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function App() {
  const [monthlyInvoices, setMonthlyInvoices] = React.useState(1200);
  const [minutesPerInvoice, setMinutesPerInvoice] = React.useState(12);
  const [hourlyCost, setHourlyCost] = React.useState(42);
  const [invoiceText, setInvoiceText] = React.useState(sampleInvoice);
  const [uploadedBy, setUploadedBy] = React.useState("ap.manager@demo.co");
  const [run, setRun] = React.useState<InvoiceRun | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const hoursSaved = Math.round((monthlyInvoices * minutesPerInvoice * 0.74) / 60);
  const monthlySavings = hoursSaved * hourlyCost;
  const estimatedSpend = monthlyInvoices <= 500 ? 99 : monthlyInvoices <= 2500 ? 299 : 799;
  const roi = Math.max(0, Math.round(((monthlySavings - estimatedSpend) / estimatedSpend) * 100));

  const submitRun = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(`${apiBase}/api/runs/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "northstar-invoice-demo.txt",
          text: invoiceText,
          uploadedBy
        })
      });

      if (!response.ok) {
        throw new Error(`Run failed with ${response.status}`);
      }

      const data = (await response.json()) as InvoiceRun;
      setRun(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoice run failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="hero">
        <nav className="topbar" aria-label="Primary navigation">
          <div className="brand">
            <ReceiptText size={26} aria-hidden="true" />
            <span>LedgerLift AI</span>
          </div>
          <div className="navlinks">
            <a href="#workflow">Workflow</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={16} aria-hidden="true" />
              AP automation for lean finance teams
            </div>
            <h1>Validated invoice approvals before the close-day rush.</h1>
            <p>
              LedgerLift AI extracts invoice data, checks vendor and PO context, catches anomalies, and produces accounting-ready exports with a complete audit trail.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#dashboard">
                Open dashboard <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-link" href="#roi">Calculate ROI</a>
            </div>
          </div>

          <div className="hero-panel" aria-label="LedgerLift invoice workflow metrics">
            <div className="metric-strip">
              <div>
                <span>Invoices cleared</span>
                <strong>1,284</strong>
              </div>
              <div>
                <span>Exception rate</span>
                <strong>8.6%</strong>
              </div>
              <div>
                <span>AI cost</span>
                <strong>$27.14</strong>
              </div>
            </div>
            <div className="invoice-preview">
              <div className="invoice-header">
                <FileCheck2 size={22} aria-hidden="true" />
                <div>
                  <strong>INV-44821</strong>
                  <span>Northstar Office Supply</span>
                </div>
                <BadgeCheck className="approved-icon" size={24} aria-hidden="true" />
              </div>
              <div className="approval-path">
                <span>Extracted</span>
                <span>Matched PO-10045</span>
                <span>Queued for approval</span>
              </div>
              <div className="confidence-bar" aria-label="Confidence score 94 percent">
                <span style={{ width: "94%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="band">
        <div className="section-heading">
          <span>Before and after</span>
          <h2>From inbox sprawl to a controlled AP lane.</h2>
        </div>
        <div className="workflow-grid">
          <div className="workflow-column before">
            <h3>Before LedgerLift</h3>
            {["Invoices buried in email", "Manual coding and PO lookup", "Duplicate checks in spreadsheets", "Approvals chased by chat"].map((item) => (
              <div className="workflow-step" key={item}>
                <AlertTriangle size={18} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="workflow-column after">
            <h3>After LedgerLift</h3>
            {["AI extracts strict JSON", "Rules validate totals and vendors", "Exceptions route with context", "Exports land accounting-ready"].map((item) => (
              <div className="workflow-step" key={item}>
                <Check size={18} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roi" className="roi-section">
        <div className="section-heading">
          <span>ROI calculator</span>
          <h2>Price the work your team gets back.</h2>
        </div>
        <div className="roi-grid">
          <div className="calculator">
            <label>
              Monthly invoices
              <input type="number" value={monthlyInvoices} min={100} onChange={(event) => setMonthlyInvoices(Number(event.target.value))} />
            </label>
            <label>
              Minutes per invoice today
              <input type="number" value={minutesPerInvoice} min={3} onChange={(event) => setMinutesPerInvoice(Number(event.target.value))} />
            </label>
            <label>
              Loaded AP hourly cost
              <input type="number" value={hourlyCost} min={20} onChange={(event) => setHourlyCost(Number(event.target.value))} />
            </label>
          </div>
          <div className="roi-results">
            <div>
              <span>Estimated monthly savings</span>
              <strong>{formatMoney(monthlySavings)}</strong>
            </div>
            <div>
              <span>Hours returned monthly</span>
              <strong>{hoursSaved}</strong>
            </div>
            <div>
              <span>Plan ROI</span>
              <strong>{roi}%</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="dashboard-section">
        <div className="dashboard-shell">
          <aside className="sidebar" aria-label="Dashboard navigation">
            <div className="brand dashboard-brand">
              <ReceiptText size={24} aria-hidden="true" />
              <span>LedgerLift</span>
            </div>
            {[
              ["Intake", UploadCloud],
              ["Queue", BellRing],
              ["Analytics", BarChart3],
              ["History", History],
              ["Settings", Settings2]
            ].map(([label, Icon]) => (
              <button className="nav-button" type="button" key={label as string} title={label as string} aria-label={label as string}>
                {React.createElement(Icon as typeof UploadCloud, { size: 18, "aria-hidden": true })}
                <span>{label as string}</span>
              </button>
            ))}
          </aside>

          <div className="dashboard-main">
            <div className="dashboard-header">
              <div>
                <span>Operations dashboard</span>
                <h2>Invoice intake and approval control room</h2>
              </div>
              <button className="run-button" onClick={submitRun} disabled={loading} type="button">
                <Play size={18} aria-hidden="true" />
                {loading ? "Running" : "Run invoice"}
              </button>
            </div>

            <div className="stat-grid">
              <Stat icon={Gauge} label="Usage credits" value="8,716" detail="1,284 used this cycle" />
              <Stat icon={Coins} label="AI spend" value="$27.14" detail="$0.021 average per invoice" />
              <Stat icon={Clock3} label="Time saved" value="386h" detail="Month-to-date estimate" />
              <Stat icon={ShieldCheck} label="Clean pass rate" value="91.4%" detail="Exceptions routed to humans" />
            </div>

            <div className="workbench">
              <section className="intake-panel" aria-labelledby="intake-title">
                <div className="panel-title">
                  <UploadCloud size={20} aria-hidden="true" />
                  <h3 id="intake-title">Invoice intake simulator</h3>
                </div>
                <label>
                  Uploaded by
                  <input value={uploadedBy} onChange={(event) => setUploadedBy(event.target.value)} />
                </label>
                <label>
                  Extracted invoice text
                  <textarea value={invoiceText} onChange={(event) => setInvoiceText(event.target.value)} rows={11} />
                </label>
                {error ? <p className="error-text">{error}</p> : null}
              </section>

              <section className="output-panel" aria-labelledby="output-title">
                <div className="panel-title">
                  <FileSearch size={20} aria-hidden="true" />
                  <h3 id="output-title">Automation output</h3>
                </div>
                {run ? (
                  <div className="run-output">
                    <div className={`status-pill ${run.status}`}>
                      {run.status.replace("_", " ")} · {Math.round(run.confidence * 100)}%
                    </div>
                    <dl>
                      <div>
                        <dt>Vendor</dt>
                        <dd>{run.extracted.vendorName}</dd>
                      </div>
                      <div>
                        <dt>Invoice</dt>
                        <dd>{run.extracted.invoiceNumber}</dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd>
                          {run.extracted.currency} {run.extracted.total.toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt>Credits</dt>
                        <dd>{run.usage.creditsUsed}</dd>
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
                    <div className="audit-box">
                      {run.auditTrail.slice(0, 4).map((entry) => (
                        <p key={`${entry.at}-${entry.action}`}>
                          <strong>{entry.action}</strong> {entry.details}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-output">
                    <ReceiptText size={34} aria-hidden="true" />
                    <p>Run the sample invoice to see structured extraction, validation, audit events, and export payloads.</p>
                  </div>
                )}
              </section>
            </div>

            <div className="queue-grid">
              <section className="panel">
                <div className="panel-title">
                  <BellRing size={20} aria-hidden="true" />
                  <h3>Approval queue</h3>
                </div>
                {queueRows.map((row) => (
                  <div className="queue-row" key={row.invoice}>
                    <div>
                      <strong>{row.vendor}</strong>
                      <span>{row.amount}</span>
                    </div>
                    <em className={row.tone}>{row.flag}</em>
                  </div>
                ))}
              </section>

              <section className="panel">
                <div className="panel-title">
                  <History size={20} aria-hidden="true" />
                  <h3>Run history</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th>Cost</th>
                      <th>Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.invoice}>
                        <td>{row.vendor}</td>
                        <td>{row.status}</td>
                        <td>{row.cost}</td>
                        <td>{row.saved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>

            <div className="settings-grid">
              <section className="panel">
                <div className="panel-title">
                  <Webhook size={20} aria-hidden="true" />
                  <h3>Export configuration</h3>
                </div>
                <div className="settings-row">
                  <span>Webhook endpoint</span>
                  <code>https://api.example.com/ap/webhook</code>
                </div>
                <div className="settings-row">
                  <span>Accounting export</span>
                  <code>CSV + JSON payload</code>
                </div>
              </section>
              <section className="panel">
                <div className="panel-title">
                  <LockKeyhole size={20} aria-hidden="true" />
                  <h3>Approval rules</h3>
                </div>
                <div className="rule-list">
                  <span>Route invoices above $5,000 to Controller</span>
                  <span>Hold duplicate invoice IDs for manual review</span>
                  <span>Escalate payment terms shorter than Net 15</span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="section-heading">
          <span>Pricing</span>
          <h2>Usage plans aligned to invoice volume.</h2>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className="price-card" key={plan.name}>
              <h3>{plan.name}</h3>
              <p>
                <strong>{plan.price}</strong>
                <span>/mo</span>
              </p>
              <em>{plan.volume}</em>
              {plan.features.map((feature) => (
                <div className="feature-row" key={feature}>
                  <Check size={17} aria-hidden="true" />
                  <span>{feature}</span>
                </div>
              ))}
            </article>
          ))}
        </div>
        <div className="trust-row" aria-label="Trust signals">
          {trustedBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof Gauge; label: string; value: string; detail: string }) {
  return (
    <div className="stat-card">
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
