-- =============================================================================================
-- Rights Graph — database schema (PostgreSQL 16)
--
-- The system of record behind the nine surfaces. Written from "Rights Graph — Centralized
-- Reframe & Data Model" (the ERD, resolution rules, invariants, write path, proof log, read
-- models) and from what the prototype in this repository had to hold to work (requests,
-- notifications, escalation, tenancy, ingestion, the S9 API).
--
-- Seven schemas, one job each:
--   graph     — the facts: assets, parties, agreements, and the four fact kinds that never share
--               a table (rights assertions, clearance grants, attestations, provenance) — plus
--               links, conflicts, registrations and the resolver's read models
--   workflow  — what needs a person: requests (the approval inbox), escalation, notifications
--   tenancy   — organisations, people, roles, delegates, identity, sharing, access, audit
--   ingest    — feeds, batches, row errors, field mappings, match results, coverage
--   api       — keys and scopes, idempotency, the command log and its outbox, webhooks, usage
--   proof     — the Proof Log: hash-chained signed events, Merkle batches, keys, receipts
--               (its own service and database account in production — see the doc, §Proof)
--
-- Conventions
--   * Append-only where the doc says so: assertions, grants and attestations are never updated in
--     place; a correction is a NEW row that closes the old one's system time (`tx_period`).
--   * Bitemporal: `valid_period` (real-world validity, daterange) and `tx_period` (when we
--     believed it, tstzrange). Every read takes both — see graph.assertions_as_of().
--   * Shares are numeric(9,6), 0–100. Money is numeric(18,2) with an ISO 4217 code beside it.
--   * Ids are uuid; external identifiers (ISRC, ISWC, IPI, UPC…) live in *_identifier tables.
--   * Closed vocabularies are enums, so a value the model does not know is refused on write.
-- =============================================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- exclusion constraints over uuid + ranges
-- Hashes use the built-in sha256(); uuids the built-in gen_random_uuid(); envelope keys live in a KMS.

CREATE SCHEMA IF NOT EXISTS graph;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS tenancy;
CREATE SCHEMA IF NOT EXISTS ingest;
CREATE SCHEMA IF NOT EXISTS api;
CREATE SCHEMA IF NOT EXISTS proof;

-- ---------------------------------------------------------------------------------------------
-- Vocabularies
-- ---------------------------------------------------------------------------------------------

CREATE TYPE graph.asset_kind      AS ENUM ('work', 'recording', 'video', 'release');
CREATE TYPE graph.copyright_side  AS ENUM ('master', 'composition');
CREATE TYPE graph.grant_side      AS ENUM ('master', 'composition', 'both');
CREATE TYPE graph.interest        AS ENUM ('owns', 'controls', 'administers', 'collects');
CREATE TYPE graph.share_type      AS ENUM ('writer', 'publisher', 'master', 'performer', 'producer');
-- RAD taxonomy v1, as the surfaces name it.
CREATE TYPE graph.right_type      AS ENUM ('mechanical', 'performance', 'sync', 'print', 'lyrics',
                                           'master_use', 'neighbouring', 'making_available', 'ugc');
CREATE TYPE graph.deal_basis      AS ENUM ('at_source', 'receipts');
-- Ownership precedence v1: the rank a source holds when claims disagree (1 strongest).
CREATE TYPE graph.source_kind     AS ENUM ('signed_agreement', 'society_acknowledgement', 'cwr_submitted',
                                           'label_declaration', 'self_declared', 'platform_claim');
CREATE TYPE graph.claim_state     AS ENUM ('resolved', 'contested', 'no_authority', 'superseded', 'withdrawn');
CREATE TYPE graph.party_kind      AS ENUM ('label', 'distributor', 'publisher', 'artist', 'writer', 'delegate',
                                           'contributor', 'society', 'ai_platform', 'dsp', 'ugc_platform',
                                           'verifier', 'operator');
CREATE TYPE graph.use_type        AS ENUM ('stream', 'download', 'ugc', 'sync', 'ai_training',
                                           'ai_gen_derivative', 'ai_voice_nil', 'ai_streaming');
CREATE TYPE graph.scope_level     AS ENUM ('artist', 'asset', 'release', 'label', 'catalogue');
CREATE TYPE graph.grant_effect    AS ENUM ('grant', 'deny');
CREATE TYPE graph.partner_scope   AS ENUM ('all_approved', 'allowlist', 'denylist');
CREATE TYPE graph.grant_state     AS ENUM ('live', 'paused', 'revoked');
CREATE TYPE graph.claim_type      AS ENUM ('role_confirmed', 'role_denied', 'human_performed',
                                           'voice_nil_consent', 'ai_disclosure', 'ai_opt_out',
                                           'identity_confirmed');
CREATE TYPE graph.assurance       AS ENUM ('basic', 'verified', 'verified_id');
CREATE TYPE graph.attestation_subject AS ENUM ('asset', 'credit', 'grant', 'artist', 'provenance');
CREATE TYPE graph.attestation_state   AS ENUM ('requested', 'signed', 'disputed', 'revoked');
CREATE TYPE graph.credit_state    AS ENUM ('to_confirm', 'confirmed', 'denied');
CREATE TYPE graph.creation_class  AS ENUM ('human', 'ai_assisted', 'ai_generated');
CREATE TYPE graph.derivation_kind AS ENUM ('sample', 'interpolation', 'remix', 'cover', 'translation',
                                           'arrangement', 'ai_derived');
CREATE TYPE graph.portion         AS ENUM ('full', 'partial', 'medley_segment');
CREATE TYPE graph.conflict_kind   AS ENUM ('overclaim', 'gap', 'missing_work_link', 'territory_overlap',
                                           'expired_but_paying', 'attestation_dispute', 'unauthorized_grant');
CREATE TYPE graph.severity        AS ENUM ('high', 'medium', 'low');
CREATE TYPE graph.conflict_state  AS ENUM ('open', 'awaiting_evidence', 'resolved');
CREATE TYPE graph.registration_state AS ENUM ('missing', 'sent', 'acknowledged', 'rejected');
CREATE TYPE graph.match_state     AS ENUM ('suggested', 'accepted', 'rejected', 'unmerged');
CREATE TYPE graph.rule_state      AS ENUM ('draft', 'published', 'retired');

CREATE TYPE workflow.request_type  AS ENUM ('licence', 'attestation', 'conflict_response',
                                            'credit_confirmation', 'delegate_approval', 'profile_claim');
CREATE TYPE workflow.request_state AS ENUM ('needs_decision', 'auto_cleared', 'approved', 'declined',
                                            'countered', 'escalated', 'responded');
CREATE TYPE workflow.licence_model AS ENUM ('dynamic', 'flat');
CREATE TYPE workflow.channel       AS ENUM ('in_app', 'push', 'email');
CREATE TYPE workflow.digest        AS ENUM ('off', 'daily', 'weekly');
CREATE TYPE workflow.delivery_state AS ENUM ('queued', 'sent', 'failed', 'suppressed');

CREATE TYPE tenancy.role           AS ENUM ('label_member', 'label_admin', 'publisher_member', 'publisher_admin',
                                            'artist', 'writer', 'delegate', 'contributor_admin', 'partner',
                                            'operator_rights_ops', 'operator_data_engineer', 'revelator_support');
CREATE TYPE tenancy.sharing_level  AS ENUM ('shared', 'private', 'encrypted');
CREATE TYPE tenancy.id_outcome     AS ENUM ('passed', 'retake', 'failed');

CREATE TYPE ingest.lane            AS ENUM ('owned', 'free', 'borrowed', 'bought', 'revelator');
CREATE TYPE ingest.channel         AS ENUM ('ddex', 'cwr', 'api', 'sftp', 'webhook', 'upload');
CREATE TYPE ingest.file_format     AS ENUM ('ddex_ern', 'ddex_mwn', 'cwr', 'csv', 'parquet', 'json');
CREATE TYPE ingest.batch_state     AS ENUM ('received', 'validating', 'row_errors', 'ingesting', 'matched', 'rejected');
CREATE TYPE ingest.match_outcome   AS ENUM ('matched', 'new', 'conflicting', 'unmatched', 'suggested');
CREATE TYPE ingest.coverage_measure AS ENUM ('master_resolved', 'join_rate', 'composition_resolved', 'conflict_rate');

CREATE TYPE api.environment        AS ENUM ('sandbox', 'production');
CREATE TYPE api.command            AS ENUM ('assert_rights', 'grant_clearance', 'record_attestation',
                                            'record_provenance', 'link_recording_work', 'supersede');

CREATE TYPE proof.event_type       AS ENUM ('genesis', 'ownership_snapshot', 'clearance_granted', 'clearance_receipt',
                                            'attestation_signed', 'conflict_opened', 'conflict_resolved',
                                            'settlement', 'supersede', 'imported');

-- ---------------------------------------------------------------------------------------------
-- graph · territory
-- ---------------------------------------------------------------------------------------------

-- A normalized include/exclude set (ISO 3166-1 alpha-2, CISAC TIS where a source uses it).
-- Canonical on write: the normalizer stores one row per distinct set and reuses it.
CREATE TABLE graph.territory_set (
  territory_set_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world            boolean NOT NULL,                 -- true: every country, minus `excludes`
  includes         char(2)[] NOT NULL DEFAULT '{}',  -- used when world = false
  excludes         char(2)[] NOT NULL DEFAULT '{}',  -- used when world = true
  label            text NOT NULL,                    -- written by the normalizer: 'World excl. US, CA'
                                                     -- (array_to_string is not immutable, so not generated)
  CHECK (world OR cardinality(includes) > 0),
  CHECK (NOT world OR cardinality(includes) = 0),
  UNIQUE (world, includes, excludes)
);

-- The set expanded, one row per country it covers — what joins answer "in DE?".
CREATE TABLE graph.territory_member (
  territory_set_id uuid NOT NULL REFERENCES graph.territory_set ON DELETE CASCADE,
  country          char(2) NOT NULL,
  PRIMARY KEY (territory_set_id, country)
);
CREATE INDEX ON graph.territory_member (country);

-- ---------------------------------------------------------------------------------------------
-- graph · parties
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.party (
  party_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         graph.party_kind NOT NULL,
  name         text NOT NULL,
  country      char(2),
  society_id   uuid REFERENCES graph.party,          -- a writer's or publisher's affiliation
  assurance    graph.assurance,                       -- ArtistID level, for a person
  tenant_id    uuid,                                  -- the contributor tenant that supplied it (RLS)
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE graph.party_identifier (
  party_id  uuid NOT NULL REFERENCES graph.party ON DELETE CASCADE,
  scheme    text NOT NULL CHECK (scheme IN ('ipi', 'isni', 'artist_id', 'dpid', 'society_member', 'ow_party')),
  value     text NOT NULL,
  valid     boolean NOT NULL DEFAULT true,            -- an identifier that failed its check is kept, never linked
  source_id uuid,
  PRIMARY KEY (scheme, value, party_id)
);
CREATE INDEX ON graph.party_identifier (party_id);

-- ---------------------------------------------------------------------------------------------
-- graph · assets — one supertype, four kinds, so every fact addresses an asset the same way
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.asset (
  asset_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         graph.asset_kind NOT NULL,
  title        text NOT NULL,
  display_artist text,
  label_party_id uuid REFERENCES graph.party,         -- whose catalogue (master side)
  tenant_id    uuid,                                  -- contributor tenant (RLS)
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, kind)                             -- lets the subtype tables pin the kind
);

CREATE TABLE graph.work (
  asset_id uuid PRIMARY KEY,
  kind     graph.asset_kind NOT NULL DEFAULT 'work' CHECK (kind = 'work'),
  FOREIGN KEY (asset_id, kind) REFERENCES graph.asset (asset_id, kind) ON DELETE CASCADE
);

CREATE TABLE graph.recording (
  asset_id      uuid PRIMARY KEY,
  kind          graph.asset_kind NOT NULL DEFAULT 'recording' CHECK (kind = 'recording'),
  duration_s    integer CHECK (duration_s > 0),
  released_on   date,
  first_delivered_at timestamptz,                     -- DSP delivery succeeded: the claim can reach T2
  FOREIGN KEY (asset_id, kind) REFERENCES graph.asset (asset_id, kind) ON DELETE CASCADE
);

CREATE TABLE graph.video (
  asset_id      uuid PRIMARY KEY,
  kind          graph.asset_kind NOT NULL DEFAULT 'video' CHECK (kind = 'video'),
  duration_s    integer CHECK (duration_s > 0),
  released_on   date,
  FOREIGN KEY (asset_id, kind) REFERENCES graph.asset (asset_id, kind) ON DELETE CASCADE
);

-- A release packages assets and never holds rights (no assertion may point at one).
CREATE TABLE graph.release (
  asset_id      uuid PRIMARY KEY,
  kind          graph.asset_kind NOT NULL DEFAULT 'release' CHECK (kind = 'release'),
  released_on   date,
  FOREIGN KEY (asset_id, kind) REFERENCES graph.asset (asset_id, kind) ON DELETE CASCADE
);

CREATE TABLE graph.asset_identifier (
  asset_id  uuid NOT NULL REFERENCES graph.asset ON DELETE CASCADE,
  scheme    text NOT NULL CHECK (scheme IN ('isrc', 'iswc', 'upc', 'ean', 'grid', 'society_work_number',
                                            'ow_uri', 'proprietary')),
  value     text NOT NULL,
  issuer_party_id uuid REFERENCES graph.party,        -- for society work numbers and proprietary ids
  valid     boolean NOT NULL DEFAULT true,            -- stored as invalid, not linked, when a check digit fails
  source_id uuid,
  PRIMARY KEY (scheme, value, asset_id)
);
CREATE INDEX ON graph.asset_identifier (asset_id);
CREATE UNIQUE INDEX asset_identifier_one_valid ON graph.asset_identifier (scheme, value)
  WHERE valid AND scheme IN ('isrc', 'iswc', 'upc', 'ean');

-- ---------------------------------------------------------------------------------------------
-- graph · links — only DIRECT links are stored; what a video touches is resolved at read time
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.recording_work (
  recording_id uuid NOT NULL REFERENCES graph.recording ON DELETE CASCADE,
  work_id      uuid NOT NULL REFERENCES graph.work ON DELETE CASCADE,
  portion      graph.portion NOT NULL DEFAULT 'full',
  method       text NOT NULL,                         -- 'publisher confirmed', 'ddex_mwn', 'label', 'match:lyric_fingerprint'
  confidence   numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  source_id    uuid,
  linked_by_party_id uuid REFERENCES graph.party,
  confirmed_by_party_id uuid REFERENCES graph.party,  -- the controlling publisher, where policy requires it
  tx_period    tstzrange NOT NULL DEFAULT tstzrange(now(), NULL),
  PRIMARY KEY (recording_id, work_id, tx_period)
);

CREATE TABLE graph.video_recording (
  video_id     uuid NOT NULL REFERENCES graph.video ON DELETE CASCADE,
  recording_id uuid NOT NULL REFERENCES graph.recording ON DELETE CASCADE,
  timecode_in  interval,
  timecode_out interval,
  usage        text NOT NULL CHECK (usage IN ('audio_track', 'background', 'excerpt')),
  PRIMARY KEY (video_id, recording_id, timecode_in)
);

CREATE TABLE graph.video_work (                       -- a work used with no label master: a cover, a live take
  video_id     uuid NOT NULL REFERENCES graph.video ON DELETE CASCADE,
  work_id      uuid NOT NULL REFERENCES graph.work ON DELETE CASCADE,
  timecode_in  interval,
  timecode_out interval,
  usage        text NOT NULL,
  PRIMARY KEY (video_id, work_id, timecode_in)
);

CREATE TABLE graph.release_item (
  release_id   uuid NOT NULL REFERENCES graph.release ON DELETE CASCADE,
  asset_id     uuid NOT NULL REFERENCES graph.asset,  -- a recording or a video
  disc         smallint NOT NULL DEFAULT 1,
  track        smallint NOT NULL,
  PRIMARY KEY (release_id, disc, track)
);

CREATE TABLE graph.derivation (
  child_asset_id  uuid NOT NULL REFERENCES graph.asset ON DELETE CASCADE,
  parent_asset_id uuid NOT NULL REFERENCES graph.asset,
  kind            graph.derivation_kind NOT NULL,
  portion         text,
  source_id       uuid,
  PRIMARY KEY (child_asset_id, parent_asset_id, kind),
  CHECK (child_asset_id <> parent_asset_id)
);

-- Credits: who is on an asset, in what role — the subject of role attestations.
CREATE TABLE graph.contribution (
  contribution_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid NOT NULL REFERENCES graph.asset ON DELETE CASCADE,
  party_id        uuid NOT NULL REFERENCES graph.party,
  role            text NOT NULL,                      -- 'main_artist', 'featured_artist', 'composer', 'lyricist', 'producer'…
  credited_name   text NOT NULL,
  state           graph.credit_state NOT NULL DEFAULT 'to_confirm',
  source_id       uuid,
  UNIQUE (asset_id, party_id, role)
);

-- Reversible dedupe: never a destructive merge. Unmerging closes the row; downstream recomputes.
CREATE TABLE graph.same_as (
  same_as_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind  text NOT NULL CHECK (subject_kind IN ('party', 'asset')),
  left_id       uuid NOT NULL,
  right_id      uuid NOT NULL,
  method        text NOT NULL,                        -- 'name+cowriter', 'lyric_fingerprint', 'isni'
  confidence    numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  state         graph.match_state NOT NULL DEFAULT 'suggested',
  reviewer      uuid,                                 -- tenancy.person
  reason        text,
  tx_period     tstzrange NOT NULL DEFAULT tstzrange(now(), NULL),
  CHECK (left_id <> right_id)
);
CREATE INDEX ON graph.same_as (subject_kind, left_id);
CREATE INDEX ON graph.same_as (subject_kind, right_id);

-- ---------------------------------------------------------------------------------------------
-- graph · sources and agreements
-- ---------------------------------------------------------------------------------------------

-- Where a claim came from. Its `kind` is its precedence; `permitted_use` carries a licensed
-- source's limits, applied on read (a free source's terms travel with what it asserted).
CREATE TABLE graph.source (
  source_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          graph.source_kind NOT NULL,
  reference     text NOT NULL,                        -- 'AGR-101', 'GEMA ack 2026-03-0412', 'DDEX ERN BLF-24-0412'
  lane          ingest.lane,
  feed_id       uuid,                                 -- ingest.feed, where it came in by a feed
  batch_id      uuid,                                 -- ingest.batch
  permitted_use text,
  received_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON graph.source (kind);

CREATE TABLE graph.agreement (
  agreement_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,                 -- 'AGR-101'
  title         text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('recording', 'publishing', 'sub_publishing', 'administration',
                                              'distribution', 'licence')),
  valid_period  daterange NOT NULL,
  deal_basis    graph.deal_basis,
  territory_set_id uuid NOT NULL REFERENCES graph.territory_set,
  tenant_id     uuid,
  -- Private terms (rates, advances, retention) are envelope-encrypted with the contributor's key,
  -- held in a KMS. Nobody — WMG included — reads them outside an audit window (tenancy.audit_window).
  terms_ciphertext bytea,
  terms_key_ref    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE graph.agreement_party (
  agreement_id uuid NOT NULL REFERENCES graph.agreement ON DELETE CASCADE,
  party_id     uuid NOT NULL REFERENCES graph.party,
  role         text NOT NULL,                         -- 'publisher', 'writer', 'label', 'artist', 'sub_publisher'
  PRIMARY KEY (agreement_id, party_id, role)
);

-- Clauses that give AUTHORITY: attest on behalf, AI consent, reversion — cited by grants and attestations.
CREATE TABLE graph.agreement_clause (
  agreement_id uuid NOT NULL REFERENCES graph.agreement ON DELETE CASCADE,
  clause       text NOT NULL,                         -- '§7.4'
  summary      text NOT NULL,
  grants_authority text[] NOT NULL DEFAULT '{}',      -- e.g. {'attest_voice_nil_on_behalf','ai_consent_master'}
  PRIMARY KEY (agreement_id, clause)
);

-- ---------------------------------------------------------------------------------------------
-- graph · RIGHTS ASSERTIONS — the ownership layer. Every source's claim is its own row.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.rights_assertion (
  assertion_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       uuid NOT NULL REFERENCES graph.asset,
  party_id       uuid NOT NULL REFERENCES graph.party,
  side           graph.copyright_side NOT NULL,
  interest       graph.interest NOT NULL,             -- four separate edges, never one owner field
  right_type     graph.right_type NOT NULL,           -- one row per right; ingest expands "all composition"
  share_type     graph.share_type NOT NULL,
  share_pct      numeric(9,6) NOT NULL CHECK (share_pct >= 0 AND share_pct <= 100),  -- ownership, not payout
  share_of_assertion_id uuid REFERENCES graph.rights_assertion,  -- "Rhein Edition: 50% of Harbor's 50%"
  territory_set_id uuid NOT NULL REFERENCES graph.territory_set,
  valid_period   daterange NOT NULL CHECK (NOT lower_inf(valid_period)),   -- every edge has a start
  tx_period      tstzrange NOT NULL DEFAULT tstzrange(now(), NULL),
  deal_basis     graph.deal_basis,
  agreement_id   uuid REFERENCES graph.agreement,
  source_id      uuid NOT NULL REFERENCES graph.source,
  supersedes_id  uuid REFERENCES graph.rights_assertion,
  state          graph.claim_state NOT NULL DEFAULT 'resolved',
  withdrawn_at   timestamptz,
  withdrawn_by   uuid,                                -- tenancy.person
  tenant_id      uuid,                                -- the contributor tenant whose claim it is (RLS)
  -- Invariant: every OWNS / CONTROLS edge traces to an agreement or a declared source.
  CONSTRAINT owns_controls_trace CHECK (interest NOT IN ('owns', 'controls') OR agreement_id IS NOT NULL
                                        OR source_id IS NOT NULL),
  -- One source never asserts the same edge twice for overlapping time: a correction closes the
  -- old row's tx_period (supersede) rather than standing beside it.
  CONSTRAINT one_claim_per_edge EXCLUDE USING gist (
    asset_id WITH =, party_id WITH =, interest WITH =, right_type WITH =, share_type WITH =,
    territory_set_id WITH =, source_id WITH =, valid_period WITH &&, tx_period WITH &&)
);
CREATE INDEX ON graph.rights_assertion (asset_id, right_type) WHERE upper_inf(tx_period);
CREATE INDEX ON graph.rights_assertion USING gist (asset_id, valid_period, tx_period);
CREATE INDEX ON graph.rights_assertion (party_id);
CREATE INDEX ON graph.rights_assertion (source_id);

-- A release holds no rights: an assertion may point at a work, a recording or a video only.
CREATE FUNCTION graph.refuse_release_rights() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT kind FROM graph.asset WHERE asset_id = NEW.asset_id) = 'release' THEN
    RAISE EXCEPTION 'a release holds no rights; assert on its tracks (asset %)', NEW.asset_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rights_assertion_not_on_release BEFORE INSERT ON graph.rights_assertion
  FOR EACH ROW EXECUTE FUNCTION graph.refuse_release_rights();

-- Append-only: an assertion's facts never change. Only closing its system time, its state and
-- its withdrawal may be written after insert.
CREATE FUNCTION graph.append_only_assertion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.asset_id, NEW.party_id, NEW.side, NEW.interest, NEW.right_type, NEW.share_type, NEW.share_pct,
      NEW.territory_set_id, NEW.valid_period, NEW.source_id, NEW.agreement_id, lower(NEW.tx_period))
     IS DISTINCT FROM
     (OLD.asset_id, OLD.party_id, OLD.side, OLD.interest, OLD.right_type, OLD.share_type, OLD.share_pct,
      OLD.territory_set_id, OLD.valid_period, OLD.source_id, OLD.agreement_id, lower(OLD.tx_period)) THEN
    RAISE EXCEPTION 'rights assertions are append-only: write a superseding claim instead';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rights_assertion_append_only BEFORE UPDATE ON graph.rights_assertion
  FOR EACH ROW EXECUTE FUNCTION graph.append_only_assertion();
CREATE RULE rights_assertion_no_delete AS ON DELETE TO graph.rights_assertion DO INSTEAD NOTHING;

-- Evidence a party files with a claim or a conflict response: kept as a file in object storage,
-- addressed by its digest.
CREATE TABLE graph.evidence (
  evidence_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assertion_id  uuid REFERENCES graph.rights_assertion,
  conflict_id   uuid,                                 -- graph.conflict
  file_name     text NOT NULL,
  media_type    text NOT NULL,
  size_bytes    bigint NOT NULL CHECK (size_bytes >= 0),
  sha256        bytea NOT NULL,
  storage_url   text NOT NULL,                        -- WORM bucket
  filed_by      uuid NOT NULL,                        -- tenancy.person
  filed_at      timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,                          -- counterclaim step 2: evidence approved
  CHECK (assertion_id IS NOT NULL OR conflict_id IS NOT NULL)
);

-- ---------------------------------------------------------------------------------------------
-- graph · CLEARANCE GRANTS — the consent layer. Stored at the scope made, resolved at read time.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.clearance_grant (
  grant_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_level    graph.scope_level NOT NULL,
  scope_ref      uuid NOT NULL,                       -- an asset, a release, a label/catalogue party, an artist party
  copyright_side graph.grant_side NOT NULL,           -- a master grant never implies a composition grant
  use_type       graph.use_type NOT NULL,
  effect         graph.grant_effect NOT NULL,
  partner_scope  graph.partner_scope NOT NULL DEFAULT 'all_approved',
  territory_set_id uuid NOT NULL REFERENCES graph.territory_set,
  valid_period   daterange NOT NULL CHECK (NOT lower_inf(valid_period)),
  tx_period      tstzrange NOT NULL DEFAULT tstzrange(now(), NULL),
  granted_by_party_id uuid NOT NULL REFERENCES graph.party,
  -- The edge or agreement that lets the grantor grant. A grant with neither is stored, flagged,
  -- and never auto-clears.
  authority_assertion_id uuid REFERENCES graph.rights_assertion,
  authority_agreement_id uuid REFERENCES graph.agreement,
  authority_clause text,
  unauthorized   boolean NOT NULL DEFAULT false,
  conditions     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {"attestation_required":true,"licence_model":"dynamic"}
  state          graph.grant_state NOT NULL DEFAULT 'live',
  -- G-5: who decided, on whose behalf, when.
  decided_by     uuid NOT NULL,                       -- tenancy.person
  decided_on_behalf_of uuid REFERENCES graph.party,
  decided_at     timestamptz NOT NULL DEFAULT now(),
  request_id     uuid,                                -- workflow.request it answered, where one did
  supersedes_id  uuid REFERENCES graph.clearance_grant,
  CONSTRAINT artist_scope_is_voice CHECK (scope_level <> 'artist' OR use_type = 'ai_voice_nil')
);
CREATE INDEX ON graph.clearance_grant (scope_level, scope_ref, use_type) WHERE upper_inf(tx_period) AND state <> 'revoked';
CREATE INDEX ON graph.clearance_grant (granted_by_party_id);

CREATE TABLE graph.grant_partner (                    -- the allowlist or denylist
  grant_id   uuid NOT NULL REFERENCES graph.clearance_grant ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES graph.party,
  PRIMARY KEY (grant_id, partner_id)
);

-- AI training is a prerequisite for the other AI uses: revoking training revokes its dependents.
CREATE TABLE graph.use_dependency (
  use_type      graph.use_type PRIMARY KEY,
  requires      graph.use_type NOT NULL
);
INSERT INTO graph.use_dependency VALUES
  ('ai_gen_derivative', 'ai_training'), ('ai_voice_nil', 'ai_training'), ('ai_streaming', 'ai_training');

-- ---------------------------------------------------------------------------------------------
-- graph · ATTESTATIONS — the evidence layer. A signed statement, not a right.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.attestation (
  attestation_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attestor_party_id uuid NOT NULL REFERENCES graph.party,
  on_behalf_of_party_id uuid REFERENCES graph.party,  -- a label attesting for its artist
  subject_type     graph.attestation_subject NOT NULL,
  subject_id       uuid NOT NULL,
  claim_type       graph.claim_type NOT NULL,
  identity_assurance graph.assurance NOT NULL,        -- ArtistID level at signing
  authority_agreement_id uuid REFERENCES graph.agreement,
  authority_clause text,
  state            graph.attestation_state NOT NULL DEFAULT 'requested',
  payload          jsonb NOT NULL,                    -- the W3C VC data shape, canonical (RFC 8785)
  signature        text,                              -- JWS over the canonical payload; null while requested
  key_id           text,
  issued_at        timestamptz,
  expires_at       timestamptz,
  revoked_at       timestamptz,                       -- revocation is a new event; the original stays
  disputed_at      timestamptz,
  -- On someone's behalf, an agreement between the two must give the authority, or it waits on
  -- that person's own signature.
  CONSTRAINT on_behalf_needs_authority CHECK (on_behalf_of_party_id IS NULL OR state = 'requested'
                                              OR authority_agreement_id IS NOT NULL),
  CONSTRAINT signed_has_signature CHECK (state = 'requested' OR (signature IS NOT NULL AND issued_at IS NOT NULL))
);
CREATE INDEX ON graph.attestation (subject_type, subject_id);
CREATE INDEX ON graph.attestation (attestor_party_id);
CREATE INDEX ON graph.attestation (on_behalf_of_party_id);

-- A grant's conditions are satisfied by attestations ("attestation required" on Voice/NIL).
CREATE TABLE graph.grant_attestation (
  grant_id       uuid NOT NULL REFERENCES graph.clearance_grant,
  attestation_id uuid NOT NULL REFERENCES graph.attestation,
  PRIMARY KEY (grant_id, attestation_id)
);

-- ---------------------------------------------------------------------------------------------
-- graph · PROVENANCE — how an asset was made. Several per asset, cross-referenced, never merged.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.provenance_record (
  provenance_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         uuid NOT NULL REFERENCES graph.asset,
  creation_class   graph.creation_class NOT NULL,
  model_id         text,
  model_version_hash text,
  operator_party_id uuid REFERENCES graph.party,
  training_data_fingerprint text,                     -- null = undisclosed, deliberately
  prompt_hash      text,
  seed_hash        text,
  reported_by_party_id uuid NOT NULL REFERENCES graph.party,   -- label-declared or platform-reported
  inputs           jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{asset_id, use, clearance_receipt}]
  reported_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON graph.provenance_record (asset_id);

-- ---------------------------------------------------------------------------------------------
-- graph · CONFLICTS — disagreement is first-class; the resolver opens one rather than pick a side
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.conflict (
  conflict_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           graph.conflict_kind NOT NULL,
  asset_id       uuid NOT NULL REFERENCES graph.asset,
  side           graph.copyright_side NOT NULL,
  right_type     graph.right_type,
  severity       graph.severity NOT NULL,
  revenue_at_risk numeric(18,2) NOT NULL DEFAULT 0,
  currency       char(3) NOT NULL DEFAULT 'USD',
  total_share    numeric(9,6),                        -- the claimed total where shares disagree
  state          graph.conflict_state NOT NULL DEFAULT 'open',
  step           smallint NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 3),
                 -- counterclaim: 0 submitted · 1 evidence approved · 2 counterparty evidence · 3 resolved
  interim        text NOT NULL,                       -- what the resolver keeps paying meanwhile
  raised_by      text NOT NULL,                       -- 'GEMA acknowledgement', 'nightly gap scan'
  opened_at      timestamptz NOT NULL DEFAULT now(),
  assignee       uuid,                                -- tenancy.person (operator)
  resolved_at    timestamptz,
  resolved_by    uuid,
  resolution_reason text,
  resolution_rule_version text,                       -- graph.rule_version.version
  CONSTRAINT resolved_says_why CHECK (state <> 'resolved' OR (resolved_at IS NOT NULL AND resolution_reason IS NOT NULL))
);
CREATE INDEX ON graph.conflict (state, severity, revenue_at_risk DESC);
CREATE INDEX ON graph.conflict (asset_id);

CREATE TABLE graph.conflict_claim (
  conflict_id  uuid NOT NULL REFERENCES graph.conflict ON DELETE CASCADE,
  assertion_id uuid NOT NULL REFERENCES graph.rights_assertion,
  PRIMARY KEY (conflict_id, assertion_id)
);

CREATE TABLE graph.conflict_party (
  conflict_id uuid NOT NULL REFERENCES graph.conflict ON DELETE CASCADE,
  party_id    uuid NOT NULL REFERENCES graph.party,
  PRIMARY KEY (conflict_id, party_id)
);

-- Accepting the resolved state territory by territory (S2-7): a territory accepted is closed
-- there while the rest stay open.
CREATE TABLE graph.conflict_territory (
  conflict_id uuid NOT NULL REFERENCES graph.conflict ON DELETE CASCADE,
  country     char(2) NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid,
  PRIMARY KEY (conflict_id, country)
);

CREATE TABLE graph.conflict_comment (
  comment_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id uuid NOT NULL REFERENCES graph.conflict ON DELETE CASCADE,
  author      uuid NOT NULL,
  body        text NOT NULL,
  at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE graph.evidence ADD FOREIGN KEY (conflict_id) REFERENCES graph.conflict;

-- ---------------------------------------------------------------------------------------------
-- graph · registrations with societies
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.registration (
  work_id        uuid NOT NULL REFERENCES graph.work,
  society_party_id uuid NOT NULL REFERENCES graph.party,
  state          graph.registration_state NOT NULL,
  society_work_number text,
  sent_in_file   text,                                -- 'CWR 3.1 HBM-2610-05'
  sent_at        timestamptz,
  acknowledged_at timestamptz,
  rejection_reason text,
  PRIMARY KEY (work_id, society_party_id)
);

-- ---------------------------------------------------------------------------------------------
-- graph · resolution — versioned rules and the read models they produce
-- ---------------------------------------------------------------------------------------------

CREATE TABLE graph.rule_version (
  version        text PRIMARY KEY,                    -- 'v1.3'
  state          graph.rule_state NOT NULL,
  author         uuid NOT NULL,
  change         text NOT NULL,
  precedence     graph.source_kind[] NOT NULL,        -- strongest first
  published_at   timestamptz,
  replay_values_changed integer,
  replay_revenue_affected numeric(18,2)
);

-- A pinned snapshot of the resolved graph: a royalty run reads one and keeps its version.
CREATE TABLE graph.graph_version (
  graph_version  text PRIMARY KEY,                    -- 'gv-2026.10.20-0958'
  rule_version   text NOT NULL REFERENCES graph.rule_version,
  built_at       timestamptz NOT NULL DEFAULT now(),
  known_at       timestamptz NOT NULL                 -- the system time the snapshot resolved at
);

-- The resolved splits read model: one row per winning edge, derived — never written by a surface.
CREATE TABLE graph.resolved_edge (
  graph_version  text NOT NULL REFERENCES graph.graph_version,
  asset_id       uuid NOT NULL REFERENCES graph.asset,
  party_id       uuid NOT NULL REFERENCES graph.party,
  interest       graph.interest NOT NULL,
  right_type     graph.right_type NOT NULL,
  share_type     graph.share_type NOT NULL,
  share_pct      numeric(9,6) NOT NULL,
  territory_set_id uuid NOT NULL REFERENCES graph.territory_set,
  valid_period   daterange NOT NULL,
  deal_basis     graph.deal_basis,
  agreement_id   uuid REFERENCES graph.agreement,
  winning_assertion_ids uuid[] NOT NULL,
  PRIMARY KEY (graph_version, asset_id, party_id, interest, right_type, share_type, territory_set_id, valid_period)
);
CREATE INDEX ON graph.resolved_edge USING gist (asset_id, valid_period);

-- Effective clearance read model (P95 < 400 ms, 500 req/s): the answer per asset, use, partner,
-- territory, refreshed on any write that touches its scope chain.
CREATE TABLE graph.effective_clearance (
  clearance_id   bigserial PRIMARY KEY,
  asset_id       uuid NOT NULL REFERENCES graph.asset,
  use_type       graph.use_type NOT NULL,
  partner_id     uuid REFERENCES graph.party,         -- null: any approved partner
  country        char(2) NOT NULL,
  answer         text NOT NULL CHECK (answer IN ('granted', 'denied', 'needs_review')),
  reason_code    text NOT NULL,                       -- 'composition_not_cleared', 'missing_work_link', 'ai_default_deny'…
  master_answer  text NOT NULL,
  composition_answers jsonb NOT NULL,                 -- [{work_id, party_id, answer, grant_id, level}]
  decided_at_level text NOT NULL,                     -- the scope level, or 'default'
  deciding_grant_ids uuid[] NOT NULL DEFAULT '{}',
  valid_period   daterange NOT NULL,
  graph_version  text NOT NULL REFERENCES graph.graph_version,
  computed_at    timestamptz NOT NULL DEFAULT now()
);
-- One answer per question; a null partner is the answer for any approved partner.
CREATE UNIQUE INDEX effective_clearance_question ON graph.effective_clearance
  (asset_id, use_type, coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid), country, valid_period, graph_version);

-- Revenue the royalty engine reports per asset (attribution percentages stay in the engine).
CREATE TABLE graph.asset_revenue (
  asset_id      uuid NOT NULL REFERENCES graph.asset,
  period        daterange NOT NULL,
  country       char(2),
  net_amount    numeric(18,2) NOT NULL,
  currency      char(3) NOT NULL,
  PRIMARY KEY (asset_id, period, country)
);

-- ---------------------------------------------------------------------------------------------
-- tenancy — organisations, people, roles, delegates, identity, sharing, access
-- ---------------------------------------------------------------------------------------------

-- An organisation is a party that signs in: a label, a publisher, a contributor tenant, a partner,
-- Sureel itself. One company can be several (WMG is a label and a contributor).
CREATE TABLE tenancy.organisation (
  organisation_id uuid PRIMARY KEY REFERENCES graph.party,
  is_contributor_tenant boolean NOT NULL DEFAULT false,
  white_label     text,                               -- 'sureel', 'revelator'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenancy.person (
  person_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id      uuid REFERENCES graph.party,          -- an artist's or writer's own entry (their ArtistID)
  name          text NOT NULL,
  email         text UNIQUE,
  phone         text UNIQUE,
  assurance     graph.assurance NOT NULL DEFAULT 'basic',
  signing_key_id text,                                -- the ArtistID key their attestations are signed with
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Roles attach to an organisation and a context, not to a login.
CREATE TABLE tenancy.membership (
  person_id       uuid NOT NULL REFERENCES tenancy.person ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES tenancy.organisation ON DELETE CASCADE,
  role            tenancy.role NOT NULL,
  since           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, organisation_id, role)
);

-- A manager or lawyer acting for an artist, with a scope (S3-8).
CREATE TABLE tenancy.delegation (
  delegation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_party_id uuid NOT NULL REFERENCES graph.party,
  delegate_person_id uuid REFERENCES tenancy.person,  -- null until the invitation is accepted
  invited_email  text NOT NULL,
  scope          text[] NOT NULL,                     -- {'sync_approvals','credit_confirmations'}
  invited_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at    timestamptz,
  revoked_at     timestamptz
);

CREATE TABLE tenancy.identity_check (
  check_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES tenancy.person ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('passport', 'national_id', 'driving_licence')),
  outcome       tenancy.id_outcome NOT NULL,
  provider_ref  text,                                 -- the ID-check vendor's case id; images stay with the vendor
  checked_at    timestamptz NOT NULL DEFAULT now()
);

-- A person claiming an entry in the graph as theirs (S3-2); confirmed by the label or Sureel.
CREATE TABLE tenancy.profile_claim (
  claim_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES tenancy.person,
  entry_party_id uuid NOT NULL REFERENCES graph.party,
  confirmer_party_id uuid NOT NULL REFERENCES graph.party,
  request_id    uuid,                                 -- workflow.request in the confirmer's inbox
  evidence_id   uuid REFERENCES graph.evidence,
  state         text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'verified', 'declined')),
  claimed_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  UNIQUE (person_id, entry_party_id)
);

-- What a contributor shares, keeps private or encrypts, field by field (S5-5).
CREATE TABLE tenancy.sharing_policy (
  tenant_id   uuid NOT NULL REFERENCES tenancy.organisation,
  field       text NOT NULL,                          -- 'agreement_reference', 'royalty_rates', 'share_totals'
  level       tenancy.sharing_level NOT NULL,
  changed_by  uuid NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, field)
);
CREATE TABLE tenancy.sharing_policy_log (
  tenant_id   uuid NOT NULL,
  field       text NOT NULL,
  before      tenancy.sharing_level,
  after       tenancy.sharing_level NOT NULL,
  changed_by  uuid NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

-- A logged, time-boxed window in which operators may read a contributor's private terms.
CREATE TABLE tenancy.audit_window (
  window_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenancy.organisation,
  opened_by    uuid NOT NULL REFERENCES tenancy.person,
  reason       text NOT NULL,
  fields       text[] NOT NULL,
  period       tstzrange NOT NULL CHECK (upper(period) - lower(period) <= interval '24 hours'),
  opened_at    timestamptz NOT NULL DEFAULT now()
);

-- Every read of a contributor's data (S5-6), within the hour.
CREATE TABLE tenancy.access_log (
  access_id   bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenancy.organisation,
  at          timestamptz NOT NULL DEFAULT now(),
  reader      text NOT NULL,                          -- a person, a partner, or an internal job
  via         text NOT NULL,                          -- 'Clearance API · ck_live_91d0', 'Graph Console'
  what        text NOT NULL,
  audit_window_id uuid REFERENCES tenancy.audit_window
);
CREATE INDEX ON tenancy.access_log (tenant_id, at DESC);

-- ---------------------------------------------------------------------------------------------
-- workflow — the approval inbox, escalation, notifications
-- ---------------------------------------------------------------------------------------------

CREATE TABLE workflow.request (
  request_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           workflow.request_type NOT NULL,
  from_party_id  uuid NOT NULL REFERENCES graph.party,
  to_party_id    uuid NOT NULL REFERENCES graph.party, -- whose inbox
  use_type       graph.use_type,
  side           graph.copyright_side,
  scope_level    graph.scope_level NOT NULL,
  scope_ref      uuid NOT NULL,
  territory_set_id uuid NOT NULL REFERENCES graph.territory_set,
  valid_period   daterange NOT NULL,
  deadline       timestamptz NOT NULL,
  received_at    timestamptz NOT NULL DEFAULT now(),
  state          workflow.request_state NOT NULL DEFAULT 'needs_decision',
  purpose        text NOT NULL,
  licence_model  workflow.licence_model,
  parent_request_id uuid REFERENCES workflow.request, -- one partner ask fanned out to each side's holder
  cleared_by_grant_id uuid REFERENCES graph.clearance_grant,
  about_type     text CHECK (about_type IN ('conflict', 'credit', 'attestation', 'profile_claim')),
  about_id       uuid,
  decided_by     uuid REFERENCES tenancy.person,
  decided_on_behalf_of uuid REFERENCES graph.party,
  decided_authority text,
  decided_at     timestamptz,
  counter_terms  jsonb,
  CHECK (type <> 'licence' OR use_type IS NOT NULL),
  CHECK (state NOT IN ('approved', 'declined', 'countered', 'responded') OR decided_at IS NOT NULL)
);
CREATE INDEX ON workflow.request (to_party_id, state, deadline);
CREATE INDEX ON workflow.request (from_party_id);

-- How long an item waits before it goes up, and to whom, per organisation.
CREATE TABLE workflow.escalation_policy (
  organisation_id uuid PRIMARY KEY REFERENCES tenancy.organisation,
  wait            interval NOT NULL DEFAULT interval '7 days',
  chain           tenancy.role[] NOT NULL             -- {'label_admin','revelator_support'}
);

CREATE TABLE workflow.escalation (
  escalation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid NOT NULL REFERENCES workflow.request ON DELETE CASCADE,
  level          smallint NOT NULL CHECK (level >= 1),
  from_role      tenancy.role NOT NULL,
  to_role        tenancy.role NOT NULL,
  to_person_id   uuid REFERENCES tenancy.person,
  at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, level)
);

CREATE TABLE workflow.notification_pref (
  person_id   uuid PRIMARY KEY REFERENCES tenancy.person ON DELETE CASCADE,
  email       boolean NOT NULL DEFAULT true,
  push        boolean NOT NULL DEFAULT true,          -- the artist app only
  digest      workflow.digest NOT NULL DEFAULT 'off',
  quiet_hours int4range,                              -- hours of the day push keeps quiet, e.g. [22,7)
  timezone    text NOT NULL DEFAULT 'UTC'
);

CREATE TABLE workflow.notification (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    uuid NOT NULL REFERENCES tenancy.person ON DELETE CASCADE,
  kind         text NOT NULL,                         -- 'request_received', 'attested_on_your_behalf', 'conflict_moved'…
  about_type   text NOT NULL,
  about_id     uuid NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  at           timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz
);
CREATE INDEX ON workflow.notification (person_id, at DESC) WHERE read_at IS NULL;

CREATE TABLE workflow.notification_delivery (
  notification_id uuid NOT NULL REFERENCES workflow.notification ON DELETE CASCADE,
  channel      workflow.channel NOT NULL,
  state        workflow.delivery_state NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz NOT NULL,                  -- later than `at` in quiet hours or a digest
  sent_at      timestamptz,
  digest       workflow.digest,                       -- the digest it went in, where it did
  provider_ref text,
  PRIMARY KEY (notification_id, channel)
);
CREATE INDEX ON workflow.notification_delivery (state, scheduled_at);

-- ---------------------------------------------------------------------------------------------
-- ingest — feeds, batches, row errors, mappings, match results, coverage
-- ---------------------------------------------------------------------------------------------

CREATE TABLE ingest.feed (
  feed_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  lane         ingest.lane NOT NULL,
  channel      ingest.channel NOT NULL,
  tenant_id    uuid REFERENCES tenancy.organisation,
  cadence      interval NOT NULL,
  error_budget numeric(5,2) NOT NULL DEFAULT 2.0,     -- percent of rows
  last_received_at timestamptz,
  next_due_at  timestamptz
);

CREATE TABLE ingest.batch (
  batch_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenancy.organisation,
  feed_id      uuid REFERENCES ingest.feed,
  file_name    text NOT NULL,
  format       ingest.file_format NOT NULL,
  channel      ingest.channel NOT NULL,
  sha256       bytea NOT NULL,
  storage_url  text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  state        ingest.batch_state NOT NULL DEFAULT 'received',
  rows_total   integer NOT NULL DEFAULT 0,
  rows_valid   integer NOT NULL DEFAULT 0,
  rows_ingested integer NOT NULL DEFAULT 0,
  rows_matched integer NOT NULL DEFAULT 0,
  rows_failed  integer NOT NULL DEFAULT 0,
  mapping_id   uuid,                                  -- ingest.field_mapping applied
  resubmits_batch_id uuid REFERENCES ingest.batch     -- a corrected file replacing a held one
);
CREATE INDEX ON ingest.batch (tenant_id, received_at DESC);

-- Nothing is ingested until a batch's errors are fixed or its failed rows dropped (S5-1).
CREATE TABLE ingest.row_error (
  batch_id  uuid NOT NULL REFERENCES ingest.batch ON DELETE CASCADE,
  row_no    integer NOT NULL,
  field     text NOT NULL,
  value     text,
  problem   text NOT NULL,
  dropped   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (batch_id, row_no, field)
);

CREATE TABLE ingest.field_mapping (                   -- a saved mapping, reused on the next file
  mapping_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenancy.organisation,
  name         text NOT NULL,
  headers_signature text NOT NULL,                    -- sorted headers, hashed: recognises the next file
  rules        jsonb NOT NULL,                        -- [{header, target_field, confidence, state}]
  saved_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, headers_signature)
);
ALTER TABLE ingest.batch ADD FOREIGN KEY (mapping_id) REFERENCES ingest.field_mapping;

CREATE TABLE ingest.match_result (
  batch_id     uuid NOT NULL REFERENCES ingest.batch ON DELETE CASCADE,
  row_no       integer NOT NULL,
  outcome      ingest.match_outcome NOT NULL,
  asset_id     uuid REFERENCES graph.asset,
  party_id     uuid REFERENCES graph.party,
  conflict_id  uuid REFERENCES graph.conflict,
  confidence   numeric(4,3),
  PRIMARY KEY (batch_id, row_no)
);
CREATE INDEX ON ingest.match_result (batch_id, outcome);

-- The four coverage measures, revenue-weighted, per lane per month — the 30 Nov gate number.
CREATE TABLE ingest.coverage_snapshot (
  month        date NOT NULL CHECK (extract(day FROM month) = 1),
  lane         ingest.lane NOT NULL,
  tenant_id    uuid REFERENCES tenancy.organisation,  -- null: the whole graph
  measure      ingest.coverage_measure NOT NULL,
  value_pct    numeric(6,3) NOT NULL CHECK (value_pct BETWEEN 0 AND 100),
  graph_version text REFERENCES graph.graph_version
);
CREATE UNIQUE INDEX coverage_snapshot_key ON ingest.coverage_snapshot
  (month, lane, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), measure);

-- ---------------------------------------------------------------------------------------------
-- api — keys, idempotency, the command log and its outbox, webhooks, usage
-- ---------------------------------------------------------------------------------------------

CREATE TABLE api.key (
  key_id       text PRIMARY KEY,                      -- the public prefix: 'ck_live_91d0'
  secret_hash  bytea NOT NULL,                        -- argon2id/sha-256 of the secret; the secret is shown once
  holder_party_id uuid NOT NULL REFERENCES graph.party,
  environment  api.environment NOT NULL,
  scopes       text[] NOT NULL,                       -- {'clearance:read','usage:write','claims:write'}
  audience     text NOT NULL CHECK (audience IN ('partner', 'holder', 'operator')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  rotated_from text REFERENCES api.key,
  expires_at   timestamptz,                           -- a rotated key works until here
  revoked_at   timestamptz
);
CREATE INDEX ON api.key (holder_party_id);

-- The same key and Idempotency-Key replay the first answer; a different body is a 409.
CREATE TABLE api.idempotency (
  key_id       text NOT NULL REFERENCES api.key,
  idempotency_key text NOT NULL,
  request_hash bytea NOT NULL,
  response_status smallint NOT NULL,
  response_body jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_id, idempotency_key)
);

-- The write path's event store: every typed command, in the same transaction as its projection.
CREATE TABLE api.command_event (
  event_seq    bigserial PRIMARY KEY,
  event_id     text NOT NULL UNIQUE,                  -- 'evt_…' — unguessable
  command      api.command NOT NULL,
  key_id       text REFERENCES api.key,               -- null for a surface's own writes
  person_id    uuid REFERENCES tenancy.person,
  payload      jsonb NOT NULL,
  outcome      jsonb NOT NULL,                        -- per item: applied / flagged / invalid / unmatched / rejected
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON api.command_event (key_id, at DESC);

-- Outbox: enqueued in the write transaction, drained to the Proof Log and to webhooks.
CREATE TABLE api.outbox (
  outbox_id    bigserial PRIMARY KEY,
  event_seq    bigint NOT NULL REFERENCES api.command_event,
  destination  text NOT NULL CHECK (destination IN ('proof_log', 'webhooks', 'resolver')),
  enqueued_at  timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts     integer NOT NULL DEFAULT 0
);
CREATE INDEX ON api.outbox (destination) WHERE delivered_at IS NULL;

CREATE TABLE api.webhook_endpoint (
  endpoint_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_party_id uuid NOT NULL REFERENCES graph.party,
  url          text NOT NULL CHECK (url LIKE 'https://%'),
  events       text[] NOT NULL,                       -- {'clearance.changed','licence.paused','licence.revoked'}
  secret_hash  bytea NOT NULL,                        -- the signing secret for payloads
  enabled      boolean NOT NULL DEFAULT true
);

CREATE TABLE api.webhook_delivery (                   -- a revoke reaches subscribers within 60 s
  delivery_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id  uuid NOT NULL REFERENCES api.webhook_endpoint,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  status_code  smallint,
  attempts     integer NOT NULL DEFAULT 0
);

-- What a partner used, when, for which outputs (S6-5).
CREATE TABLE api.usage_report (
  report_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_party_id uuid NOT NULL REFERENCES graph.party,
  file_name    text,
  received_at  timestamptz NOT NULL DEFAULT now(),
  period       daterange NOT NULL
);
CREATE TABLE api.usage_row (
  report_id    uuid NOT NULL REFERENCES api.usage_report ON DELETE CASCADE,
  row_no       integer NOT NULL,
  isrc         text,
  asset_id     uuid REFERENCES graph.asset,           -- null: unmatched, flagged
  use_type     graph.use_type NOT NULL,
  used_at      timestamptz NOT NULL,
  output_ref   text,
  receipt_id   text,                                  -- proof.receipt the use was cleared under
  PRIMARY KEY (report_id, row_no)
);

-- ---------------------------------------------------------------------------------------------
-- proof — the Proof Log. Its own service, database account and keys in production; listed here
-- so the whole model reads in one place. Nothing that could identify an amount, an attribution
-- percentage, a methodology or a person goes in: event type, opaque ids, scope, use, time, hashes.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE proof.signing_key (
  key_id       text PRIMARY KEY,                      -- 'pl-ed25519-2026-07'
  algorithm    text NOT NULL DEFAULT 'Ed25519',
  public_key   bytea NOT NULL,                        -- published; private half in the HSM
  valid_period tstzrange NOT NULL                     -- rotated, never withdrawn
);

CREATE TABLE proof.batch (                            -- a Merkle tree every 5 minutes
  batch_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merkle_root  bytea NOT NULL,
  first_seq    bigint NOT NULL,
  last_seq     bigint NOT NULL,
  sealed_at    timestamptz NOT NULL,
  tsa_token    bytea NOT NULL,                        -- RFC 3161 timestamp token over the root
  published_url text,                                 -- the transparency page (and a chain, later)
  CHECK (last_seq >= first_seq)
);

CREATE TABLE proof.event (
  seq          bigint PRIMARY KEY,
  event_type   proof.event_type NOT NULL,
  subject_opaque text NOT NULL,                       -- 'ast_7e1c9b2a' — never a real id
  scope        text,
  use_type     graph.use_type,
  at           timestamptz NOT NULL,
  payload_hash bytea NOT NULL,                        -- SHA-256 of RFC 8785 canonical JSON
  prev_hash    bytea NOT NULL,
  event_hash   bytea NOT NULL UNIQUE,
  signature    bytea NOT NULL,
  signer_key_id text NOT NULL REFERENCES proof.signing_key,
  batch_id     uuid REFERENCES proof.batch,
  payload_url  text NOT NULL,                         -- WORM object storage (Object Lock, compliance mode)
  -- Imported from the on-chain registry: the original evidence, kept.
  chain_tx     text,
  chain_block  bigint,
  ow_asset_uri text
);
CREATE INDEX ON proof.event (subject_opaque);
-- The chain: each event names the hash of the one before it.
CREATE UNIQUE INDEX proof_event_prev ON proof.event (prev_hash);

-- No one rewrites or deletes a proof event — corrections are SUPERSEDE events.
CREATE RULE proof_event_no_update AS ON UPDATE TO proof.event DO INSTEAD NOTHING;
CREATE RULE proof_event_no_delete AS ON DELETE TO proof.event DO INSTEAD NOTHING;

-- A signed clearance answer a partner keeps as evidence (S6-6); verifies in S8 without an account.
CREATE TABLE proof.receipt (
  receipt_id   text PRIMARY KEY,                      -- 'rcpt_7Q2M-9F4K-CD7A'
  event_seq    bigint NOT NULL REFERENCES proof.event,
  partner_party_id uuid NOT NULL REFERENCES graph.party,
  asset_opaque text NOT NULL,
  use_type     graph.use_type NOT NULL,
  country      char(2) NOT NULL,
  answer       text NOT NULL CHECK (answer IN ('granted', 'denied', 'needs_review')),
  issued_at    timestamptz NOT NULL
);

-- ---------------------------------------------------------------------------------------------
-- Reads the doc names — bitemporal claims, overclaims and gaps, unlinked earning recordings
-- ---------------------------------------------------------------------------------------------

-- The claims as they stood: valid on `as_of`, believed at `known_at`.
CREATE FUNCTION graph.assertions_as_of(p_asset uuid, p_as_of date, p_known_at timestamptz DEFAULT now())
RETURNS SETOF graph.rights_assertion LANGUAGE sql STABLE AS $$
  SELECT * FROM graph.rights_assertion
  WHERE asset_id = p_asset
    AND valid_period @> p_as_of
    AND tx_period @> p_known_at
    AND (withdrawn_at IS NULL OR withdrawn_at > p_known_at)
$$;

-- Ownership totals per (asset, right, share type, country) today, standing claims only. One
-- party's own claims never add up: its largest standing claim is what it claims.
CREATE VIEW graph.v_share_totals AS
WITH standing AS (
  SELECT a.asset_id, a.right_type, a.share_type, m.country, a.party_id, max(a.share_pct) AS share_pct
  FROM graph.rights_assertion a
  JOIN graph.territory_member m USING (territory_set_id)
  WHERE a.interest = 'owns'
    AND a.state NOT IN ('superseded', 'withdrawn', 'no_authority')
    AND upper_inf(a.tx_period)
    AND a.valid_period @> current_date
  GROUP BY 1, 2, 3, 4, 5
)
SELECT asset_id, right_type, share_type, country, sum(share_pct) AS total,
       CASE WHEN sum(share_pct) > 100 THEN 'overclaim'
            WHEN sum(share_pct) < 100 THEN 'gap' ELSE 'whole' END AS reading
FROM standing
GROUP BY 1, 2, 3, 4;

-- Earning recordings with no Work link — publishing income unmatched (nightly, HIGH).
CREATE VIEW graph.v_unlinked_earning_recordings AS
SELECT r.asset_id AS recording_id, ai.value AS isrc, sum(v.net_amount) AS revenue_90d, v.currency
FROM graph.recording r
JOIN graph.asset_revenue v ON v.asset_id = r.asset_id AND lower(v.period) >= current_date - 90
LEFT JOIN graph.asset_identifier ai ON ai.asset_id = r.asset_id AND ai.scheme = 'isrc' AND ai.valid
WHERE NOT EXISTS (SELECT 1 FROM graph.recording_work rw
                  WHERE rw.recording_id = r.asset_id AND upper_inf(rw.tx_period))
GROUP BY 1, 2, 4;

-- The scope chain a clearance read walks for one recording, most specific first.
CREATE FUNCTION graph.scope_chain(p_recording uuid, p_artists uuid[])
RETURNS TABLE (level graph.scope_level, ref uuid, precedence int) LANGUAGE sql STABLE AS $$
  SELECT 'artist'::graph.scope_level, unnest(p_artists), 1
  UNION ALL SELECT 'asset', p_recording, 2
  UNION ALL SELECT 'release', ri.release_id, 3 FROM graph.release_item ri WHERE ri.asset_id = p_recording
  UNION ALL SELECT 'label', a.label_party_id, 4 FROM graph.asset a WHERE a.asset_id = p_recording AND a.label_party_id IS NOT NULL
  UNION ALL SELECT 'catalogue', a.label_party_id, 5 FROM graph.asset a WHERE a.asset_id = p_recording AND a.label_party_id IS NOT NULL
$$;

-- ---------------------------------------------------------------------------------------------
-- Contributor segregation — row-level security. The app sets `app.tenant_id` (and `app.role`)
-- per connection; a contributor reads its own tenant's rows, operators read under audit only.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE graph.rights_assertion ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph.agreement        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest.batch           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.access_log     ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_reads_own ON graph.rights_assertion
  USING (tenant_id IS NULL                                            -- graph-wide (non-contributor) claims
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
         OR current_setting('app.role', true) IN ('resolver', 'operator'));
CREATE POLICY tenant_reads_own ON graph.agreement
  USING (tenant_id IS NULL
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
         OR current_setting('app.role', true) = 'resolver');            -- operators: through an audit window only
CREATE POLICY tenant_reads_own ON ingest.batch
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
         OR current_setting('app.role', true) IN ('resolver', 'operator'));
CREATE POLICY tenant_reads_own ON tenancy.access_log
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
         OR current_setting('app.role', true) = 'operator');
