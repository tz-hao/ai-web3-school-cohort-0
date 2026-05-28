import { createServer } from "node:http";
import { createHmac, createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const policy = JSON.parse(readFileSync(join(root, "pact-policy.json"), "utf8"));
const auditLogPath = join(root, "audit-log.jsonl");
const ledgerPath = join(root, "settlement-ledger.json");
const sharedDemoSecret = "demo-caw-mpc-signer-secret-do-not-use-in-prod";
const port = 4020;
const resource = `http://127.0.0.1:${port}/v1/infer`;
const settledNonces = new Set();
const ledger = [];

mkdirSync(root, { recursive: true });
writeFileSync(auditLogPath, "");
writeFileSync(ledgerPath, "[]\n");

function now() {
  return new Date().toISOString();
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hmac(value) {
  return createHmac("sha256", sharedDemoSecret).update(value).digest("hex");
}

function b64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function b64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function writeAudit(event) {
  appendFileSync(auditLogPath, `${JSON.stringify({ timestamp: now(), ...event })}\n`);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

function paymentRequirement() {
  return {
    x402Version: 1,
    scheme: "exact",
    network: "base",
    asset: "USDC",
    amount: "0.10",
    payTo: "0xServiceProviderTreasury00000000000000000001",
    resource,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
}

function signPaymentPayload(requirement) {
  const payload = {
    type: "x402-demo-payment",
    agentId: policy.subject,
    pactId: policy.id,
    requirement,
    nonce: randomUUID(),
    issuedAt: now()
  };
  const encodedPayload = b64urlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${hmac(encodedPayload)}`;
}

function verifyAndSettle(paymentHeader, expectedResource) {
  if (!paymentHeader) {
    return { ok: false, reason: "missing_payment_payload" };
  }

  const [encodedPayload, signature] = paymentHeader.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false, reason: "malformed_payment_payload" };
  }

  if (hmac(encodedPayload) !== signature) {
    return { ok: false, reason: "invalid_signature" };
  }

  const payload = JSON.parse(b64urlDecode(encodedPayload));
  const req = payload.requirement;

  if (payload.pactId !== policy.id || payload.agentId !== policy.subject) {
    return { ok: false, reason: "invalid_agent_or_pact" };
  }
  if (req.resource !== expectedResource) {
    return { ok: false, reason: "resource_mismatch" };
  }
  if (new Date(req.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "payment_requirement_expired" };
  }
  if (settledNonces.has(payload.nonce)) {
    return { ok: false, reason: "replay_detected" };
  }

  settledNonces.add(payload.nonce);
  const settlement = {
    settlementTx: `demo-settlement-${sha256(payload).slice(0, 16)}`,
    network: req.network,
    asset: req.asset,
    amount: req.amount,
    recipient: req.payTo,
    nonce: payload.nonce,
    requirementHash: sha256(req),
    settledAt: now()
  };
  ledger.push(settlement);
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  writeAudit({ event: "provider_payment_settled", settlement });
  return { ok: true, payload, settlement };
}

function createProvider() {
  return createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/infer") {
      sendJson(res, 404, { error: "not_found" });
      return;
    }

    const body = await readJsonBody(req);
    const paymentHeader = req.headers["x-payment"];

    if (!paymentHeader) {
      const requirement = paymentRequirement();
      writeAudit({
        event: "provider_returned_402",
        resource,
        requirementHash: sha256(requirement)
      });
      sendJson(res, 402, {
        error: "payment_required",
        accepts: [requirement]
      });
      return;
    }

    const verification = verifyAndSettle(paymentHeader, resource);
    if (!verification.ok) {
      sendJson(res, 402, {
        error: "payment_invalid",
        reason: verification.reason,
        accepts: [paymentRequirement()]
      });
      return;
    }

    const result = {
      summary: "Demo inference result: the agent paid within a Pact budget and can now access the protected API result.",
      inputHash: sha256(body),
      recommendation: "Keep x402 payment automation behind allowlists, amount caps, time windows, and audit logs.",
      payment: {
        status: "settled",
        settlementTx: verification.settlement.settlementTx,
        amount: verification.settlement.amount,
        asset: verification.settlement.asset,
        network: verification.settlement.network
      }
    };

    writeAudit({
      event: "provider_returned_paid_result",
      settlementTx: verification.settlement.settlementTx,
      responseHash: sha256(result)
    });
    sendJson(res, 200, result);
  });
}

function assertPact(requirement) {
  const amount = Number(requirement.amount);
  const spentToday = ledger.reduce((sum, item) => sum + Number(item.amount), 0);

  const checks = [
    [new Date(policy.validFrom).getTime() <= Date.now(), "pact_not_active"],
    [new Date(policy.validUntil).getTime() >= Date.now(), "pact_expired"],
    [policy.chainAllowlist.includes(requirement.network), "chain_not_allowed"],
    [policy.assetAllowlist.includes(requirement.asset), "asset_not_allowed"],
    [policy.recipientAllowlist.includes(requirement.payTo), "recipient_not_allowed"],
    [policy.apiAllowlist.includes(requirement.resource), "api_not_allowed"],
    [amount <= Number(policy.maxAmountPerPayment), "amount_exceeds_single_payment_cap"],
    [spentToday + amount <= Number(policy.dailyBudget), "daily_budget_exceeded"],
    [ledger.length < policy.maxPaymentsPerDay, "payment_count_exceeded"],
    [amount <= Number(policy.requireHumanApprovalAbove), "requires_human_approval"]
  ];

  const failed = checks.find(([ok]) => !ok);
  if (failed) {
    return { allowed: false, reason: failed[1], spentToday };
  }
  return { allowed: true, reason: "within_pact_scope", spentToday };
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

async function runAgent() {
  const requestBody = {
    prompt: "Explain the risk boundary of an autonomous x402 agent payment."
  };

  writeAudit({
    event: "agent_started_request",
    agentId: policy.subject,
    resource,
    requestHash: sha256(requestBody)
  });

  const first = await postJson(resource, requestBody);
  if (first.status !== 402) {
    throw new Error(`Expected 402, got ${first.status}`);
  }

  const requirement = first.body.accepts[0];
  writeAudit({
    event: "agent_received_402",
    requirement,
    requirementHash: sha256(requirement)
  });

  const decision = assertPact(requirement);
  writeAudit({
    event: "pact_policy_decision",
    pactId: policy.id,
    decision,
    requirementHash: sha256(requirement)
  });

  if (!decision.allowed) {
    throw new Error(`Pact denied payment: ${decision.reason}`);
  }

  const paymentPayload = signPaymentPayload(requirement);
  writeAudit({
    event: "caw_payment_payload_created",
    pactId: policy.id,
    paymentPayloadHash: sha256(paymentPayload),
    requirementHash: sha256(requirement)
  });

  const paid = await postJson(resource, requestBody, {
    "x-payment": paymentPayload
  });

  writeAudit({
    event: "agent_completed_paid_request",
    status: paid.status,
    responseHash: sha256(paid.body),
    settlementTx: paid.body.payment?.settlementTx
  });

  return paid;
}

async function main() {
  const server = createProvider();
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  console.log(`x402 provider listening on ${resource}`);

  try {
    const response = await runAgent();
    console.log("\nAgent received final API response:");
    console.log(JSON.stringify(response.body, null, 2));
    console.log(`\nAudit log: ${auditLogPath}`);
    console.log(`Settlement ledger: ${ledgerPath}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  writeAudit({ event: "demo_failed", error: error.message });
  console.error(error);
  process.exitCode = 1;
});

