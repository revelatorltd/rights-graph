/**
 * Loads db/schema.sql into PGlite — Postgres compiled to WebAssembly, so no server is needed — and
 * checks the rules the schema enforces against the data-model doc's worked example (Northbound).
 * Run: npm run db:test
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";


const db = new PGlite({ extensions: { btree_gist } });
const sql = readFileSync(process.argv[2] ?? fileURLToPath(new URL("./schema.sql", import.meta.url)), "utf8");
let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : "  " + detail}`); if (!ok) failed++; };
const refuses = async (name, q) => { try { await db.exec(q); check(name, false, "was accepted"); } catch (e) { check(name, true); console.log("       (", e.message.slice(0, 90), ")"); } };

try { await db.exec(sql); } catch (e) { console.log("SCHEMA ERROR:", e.message); process.exit(1); }
check("the schema loads", true);

// The data-model doc's worked example: Northbound, two writers, a sub-publisher in DACH.
await db.exec(`
  INSERT INTO graph.territory_set (territory_set_id, world, includes, excludes, label) VALUES
    ('00000000-0000-0000-0000-0000000000a1', true, '{}', '{}', 'World'),
    ('00000000-0000-0000-0000-0000000000a2', false, '{DE,AT,CH}', '{}', 'DE, AT, CH'),
    ('00000000-0000-0000-0000-0000000000a3', true, '{}', '{DE,AT,CH}', 'World excl. DE, AT, CH'),
    ('00000000-0000-0000-0000-0000000000a4', false, '{DE}', '{}', 'DE');
  INSERT INTO graph.territory_member SELECT '00000000-0000-0000-0000-0000000000a1', c FROM unnest('{GB,US,DE,AT,CH,FR}'::char(2)[]) c;
  INSERT INTO graph.territory_member SELECT '00000000-0000-0000-0000-0000000000a2', c FROM unnest('{DE,AT,CH}'::char(2)[]) c;
  INSERT INTO graph.territory_member SELECT '00000000-0000-0000-0000-0000000000a3', c FROM unnest('{GB,US,FR}'::char(2)[]) c;
  INSERT INTO graph.territory_member VALUES ('00000000-0000-0000-0000-0000000000a4', 'DE');
  INSERT INTO graph.party (party_id, kind, name) VALUES
    ('00000000-0000-0000-0000-0000000000b1', 'publisher', 'Harbor Music'),
    ('00000000-0000-0000-0000-0000000000b2', 'publisher', 'Ben Songs'),
    ('00000000-0000-0000-0000-0000000000b3', 'publisher', 'Rhein Edition'),
    ('00000000-0000-0000-0000-0000000000b4', 'label', 'Kestrel Point Recordings');
  INSERT INTO graph.asset (asset_id, kind, title) VALUES
    ('00000000-0000-0000-0000-0000000000c1', 'work', 'Northbound'),
    ('00000000-0000-0000-0000-0000000000c2', 'recording', 'Northbound'),
    ('00000000-0000-0000-0000-0000000000c3', 'release', 'Northbound');
  INSERT INTO graph.work (asset_id) VALUES ('00000000-0000-0000-0000-0000000000c1');
  INSERT INTO graph.recording (asset_id) VALUES ('00000000-0000-0000-0000-0000000000c2');
  INSERT INTO graph.release (asset_id) VALUES ('00000000-0000-0000-0000-0000000000c3');
  INSERT INTO graph.agreement (agreement_id, code, title, kind, valid_period, territory_set_id) VALUES
    ('00000000-0000-0000-0000-0000000000d1', 'AGR-101', 'Ana Lindgren — songwriter agreement', 'publishing', '[2024-01-01,2031-12-31]', '00000000-0000-0000-0000-0000000000a1');
  INSERT INTO graph.source (source_id, kind, reference) VALUES
    ('00000000-0000-0000-0000-0000000000e1', 'signed_agreement', 'AGR-101'),
    ('00000000-0000-0000-0000-0000000000e2', 'society_acknowledgement', 'CWR ack ASCAP 2024-03-118'),
    ('00000000-0000-0000-0000-0000000000e3', 'society_acknowledgement', 'GEMA ack 2026-03-0412');
  INSERT INTO graph.rights_assertion (assertion_id, asset_id, party_id, side, interest, right_type, share_type, share_pct, territory_set_id, valid_period, agreement_id, source_id) VALUES
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'composition', 'owns', 'performance', 'publisher', 50, '00000000-0000-0000-0000-0000000000a1', '[2024-01-01,2031-12-31]', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1'),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'composition', 'owns', 'performance', 'publisher', 50, '00000000-0000-0000-0000-0000000000a1', '[2024-03-01,)', NULL, '00000000-0000-0000-0000-0000000000e2'),
    ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'composition', 'owns', 'performance', 'publisher', 60, '00000000-0000-0000-0000-0000000000a4', '[2026-03-01,)', NULL, '00000000-0000-0000-0000-0000000000e3');
`);

const totals = await db.query(`SELECT country, total, reading FROM graph.v_share_totals WHERE right_type = 'performance' AND share_type = 'publisher' ORDER BY country`);
const de = totals.rows.find((one) => one.country === "DE"), us = totals.rows.find((one) => one.country === "US");
check("DE reads the doc's 110% overclaim", de && Number(de.total) === 110 && de.reading === "overclaim", JSON.stringify(de));
check("US reads whole at 100%", us && Number(us.total) === 100 && us.reading === "whole", JSON.stringify(us));

const past = await db.query(`SELECT count(*)::int AS n FROM graph.assertions_as_of('00000000-0000-0000-0000-0000000000c1', '2025-06-01')`);
check("as of 2025-06-01, before the GEMA claim, two claims stood", past.rows[0].n === 2, JSON.stringify(past.rows));

await refuses("a share over 100% is refused", `INSERT INTO graph.rights_assertion (asset_id, party_id, side, interest, right_type, share_type, share_pct, territory_set_id, valid_period, source_id)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'composition', 'owns', 'sync', 'publisher', 120, '00000000-0000-0000-0000-0000000000a1', '[2024-01-01,)', '00000000-0000-0000-0000-0000000000e2')`);
await refuses("an edge with no start date is refused", `INSERT INTO graph.rights_assertion (asset_id, party_id, side, interest, right_type, share_type, share_pct, territory_set_id, valid_period, source_id)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'composition', 'owns', 'sync', 'publisher', 50, '00000000-0000-0000-0000-0000000000a1', '(,2030-01-01)', '00000000-0000-0000-0000-0000000000e2')`);
await refuses("a release holds no rights", `INSERT INTO graph.rights_assertion (asset_id, party_id, side, interest, right_type, share_type, share_pct, territory_set_id, valid_period, source_id)
  VALUES ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b4', 'master', 'owns', 'master_use', 'master', 100, '00000000-0000-0000-0000-0000000000a1', '[2024-01-01,)', '00000000-0000-0000-0000-0000000000e1')`);
await refuses("one source cannot assert the same edge twice for overlapping time", `INSERT INTO graph.rights_assertion (asset_id, party_id, side, interest, right_type, share_type, share_pct, territory_set_id, valid_period, agreement_id, source_id)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'composition', 'owns', 'performance', 'publisher', 55, '00000000-0000-0000-0000-0000000000a1', '[2025-01-01,2026-01-01]', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1')`);
await refuses("an assertion's facts are append-only", `UPDATE graph.rights_assertion SET share_pct = 40 WHERE assertion_id = '00000000-0000-0000-0000-0000000000f1'`);

// A correction: close the old row's system time, write the new one — the old row stays.
await db.exec(`
  UPDATE graph.rights_assertion SET tx_period = tstzrange(lower(tx_period), now()), state = 'superseded' WHERE assertion_id = '00000000-0000-0000-0000-0000000000f5';
  INSERT INTO graph.rights_assertion (asset_id, party_id, side, interest, right_type, share_type, share_pct, territory_set_id, valid_period, source_id, supersedes_id)
    VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'composition', 'owns', 'performance', 'publisher', 50, '00000000-0000-0000-0000-0000000000a4', '[2026-03-01,)', '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000f5');`);
const after = await db.query(`SELECT total FROM graph.v_share_totals WHERE country = 'DE' AND right_type = 'performance' AND share_type = 'publisher'`);
check("a superseding correction brings DE back to 100%", Number(after.rows[0].total) === 100, JSON.stringify(after.rows));
const kept = await db.query(`SELECT count(*)::int AS n FROM graph.rights_assertion WHERE asset_id = '00000000-0000-0000-0000-0000000000c1'`);
check("… and the superseded claim is still on the record", kept.rows[0].n === 4);
await db.exec(`DELETE FROM graph.rights_assertion WHERE assertion_id = '00000000-0000-0000-0000-0000000000f1'`);
const still = await db.query(`SELECT count(*)::int AS n FROM graph.rights_assertion WHERE assertion_id = '00000000-0000-0000-0000-0000000000f1'`);
check("a delete is ignored: claims are never removed", still.rows[0].n === 1);

await refuses("a Voice/NIL-only rule: an artist-level grant must be Voice/NIL", `INSERT INTO graph.clearance_grant (scope_level, scope_ref, copyright_side, use_type, effect, territory_set_id, valid_period, granted_by_party_id, decided_by)
  VALUES ('artist', '00000000-0000-0000-0000-0000000000b4', 'master', 'ai_training', 'grant', '00000000-0000-0000-0000-0000000000a1', '[2026-10-01,)', '00000000-0000-0000-0000-0000000000b4', gen_random_uuid())`);
await refuses("an attestation signed on someone's behalf needs the agreement that allows it", `INSERT INTO graph.attestation (attestor_party_id, on_behalf_of_party_id, subject_type, subject_id, claim_type, identity_assurance, state, payload, signature, issued_at)
  VALUES ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b1', 'artist', '00000000-0000-0000-0000-0000000000b1', 'voice_nil_consent', 'verified', 'signed', '{}', 'jws', now())`);
await refuses("a resolved conflict says why", `INSERT INTO graph.conflict (kind, asset_id, side, severity, interim, raised_by, state) VALUES ('overclaim', '00000000-0000-0000-0000-0000000000c1', 'composition', 'high', 'paying rows 1–3', 'GEMA ack', 'resolved')`);
await refuses("a territory set refuses World with includes", `INSERT INTO graph.territory_set (world, includes, label) VALUES (true, '{DE}', 'x')`);
await refuses("an audit window longer than a day is refused", `INSERT INTO tenancy.audit_window (tenant_id, opened_by, reason, fields, period) VALUES (gen_random_uuid(), gen_random_uuid(), 'x', '{rates}', tstzrange(now(), now() + interval '3 days'))`);

// The Proof Log refuses rewrites.
await db.exec(`INSERT INTO proof.signing_key VALUES ('pl-ed25519-2026-07', 'Ed25519', '\\x00', tstzrange('2026-07-01', NULL));
  INSERT INTO proof.event (seq, event_type, subject_opaque, at, payload_hash, prev_hash, event_hash, signature, signer_key_id, payload_url)
  VALUES (1, 'genesis', 'ast_1', now(), sha256('a'::bytea), '\\x00', sha256('b'::bytea), '\\x01', 'pl-ed25519-2026-07', 's3://worm/1');
  UPDATE proof.event SET subject_opaque = 'tampered' WHERE seq = 1;`);
const proof = await db.query(`SELECT subject_opaque FROM proof.event WHERE seq = 1`);
check("a proof event cannot be rewritten", proof.rows[0].subject_opaque === "ast_1");

const tables = await db.query(`SELECT table_schema, count(*)::int AS n FROM information_schema.tables WHERE table_schema IN ('graph','workflow','tenancy','ingest','api','proof') AND table_type = 'BASE TABLE' GROUP BY 1 ORDER BY 1`);
console.log("tables:", tables.rows.map((one) => `${one.table_schema} ${one.n}`).join(" · "));
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
