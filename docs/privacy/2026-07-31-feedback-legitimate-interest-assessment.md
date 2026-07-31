# Feedback Diagnostics — Legitimate Interest Assessment

**Date:** 2026-07-31  
**Scope:** technical diagnostics attached only when a user deliberately submits a bug report.

## Purpose test

3D Print Assistant has a legitimate interest in reproducing and fixing reported defects, distinguishing unsupported-printer cases, and grouping duplicate failures. This directly improves reliability for the reporter and other users. Optional email is used only to answer the submitted report, never for marketing.

## Necessity test

The selected configuration, release/version, safe error facts, catalog provenance, and a short in-memory action trail are materially more reliable than asking a user to reconstruct technical state manually. The design excludes stack traces, file contents and paths, URLs/query strings, request/response bodies, IP retention, identifiers, and unrestricted logs. Diagnostics are sent only on Submit; there is no background harvesting.

## Balancing test

Users reasonably expect a bug report to include disclosed information needed to investigate it. Risk is reduced by an inline notice, closed allowlists, a 25-event RAM-only buffer, encryption of free text/email, EU-jurisdiction D1, minimized Discord alerts, owner-token access, immediate deletion, and a maximum 90-day retention period. Custom printer text remains encrypted user content. Reports are not used for advertising, profiling, or automated decisions.

The remaining risk is that voluntary free text may contain personal or sensitive information. The form warns against this; the text is encrypted, never copied to Discord, and can be located/deleted using the report ID and optional email.

## Decision and review trigger

Article 6(1)(f) legitimate interests is considered proportionate for the necessary technical diagnostics in this bounded design. Reassess before adding new fields, background transmission, account linkage, longer retention, new recipients, or automated decision-making. This is an internal accountability record, not legal advice.
