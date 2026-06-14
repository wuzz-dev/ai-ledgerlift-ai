import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { ZodError } from "zod";
import { getActiveProvider } from "./aiProvider.js";
import { invoiceRunSchema, runInvoiceAutomation } from "./invoiceEngine.js";

dotenv.config({ quiet: true });

const app = express();
const port = Number(process.env.PORT ?? 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(__dirname, "..");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "ledgerlift-ai",
    provider: getActiveProvider(),
    time: new Date().toISOString()
  });
});

app.post("/api/runs/invoice", async (request, response) => {
  try {
    const input = invoiceRunSchema.parse(request.body);
    const result = await runInvoiceAutomation(input);
    response.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "validation_error",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      });
      return;
    }

    response.status(500).json({
      error: "invoice_run_failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.use(express.static(staticDir));
app.get(/^\/(?!api).*/, (_request, response) => {
  response.sendFile(path.join(staticDir, "index.html"));
});

app.listen(port, () => {
  console.log(`LedgerLift AI API listening on http://localhost:${port}`);
});
