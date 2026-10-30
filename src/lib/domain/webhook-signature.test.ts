import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sameSecret, verifySvixSignature } from "./webhook-signature";

const SECRET = `whsec_${Buffer.from("segreto-di-prova-32-byte-lungo!!").toString("base64")}`;
const NOW = 1_800_000_000_000;

function sign(body: string, id: string, timestamp: string, secret = SECRET) {
  const key = Buffer.from(secret.slice(6), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

describe("firma Svix (webhook Resend)", () => {
  const body = '{"type":"email.received"}';
  const ts = String(NOW / 1000);

  it("accetta una firma valida, anche tra più firme", () => {
    const signature = `v1,ZmFsc2E= ${sign(body, "msg_1", ts)}`;
    expect(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature }, SECRET, NOW)).toBe(true);
  });

  it("rifiuta corpo modificato, id diverso o segreto sbagliato", () => {
    const signature = sign(body, "msg_1", ts);
    expect(verifySvixSignature(`${body} `, { id: "msg_1", timestamp: ts, signature }, SECRET, NOW)).toBe(false);
    expect(verifySvixSignature(body, { id: "msg_2", timestamp: ts, signature }, SECRET, NOW)).toBe(false);
    const other = `whsec_${Buffer.from("un-altro-segreto-di-prova-32-byte").toString("base64")}`;
    expect(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature }, other, NOW)).toBe(false);
  });

  it("rifiuta eventi troppo vecchi e intestazioni mancanti", () => {
    const old = String(NOW / 1000 - 600);
    expect(verifySvixSignature(body, { id: "msg_1", timestamp: old, signature: sign(body, "msg_1", old) }, SECRET, NOW)).toBe(false);
    expect(verifySvixSignature(body, { id: null, timestamp: ts, signature: sign(body, "msg_1", ts) }, SECRET, NOW)).toBe(false);
  });
});

describe("confronto dei segreti", () => {
  it("vero solo se uguali e non vuoti", () => {
    expect(sameSecret("abc", "abc")).toBe(true);
    expect(sameSecret("abd", "abc")).toBe(false);
    expect(sameSecret("", "")).toBe(false);
  });
});
