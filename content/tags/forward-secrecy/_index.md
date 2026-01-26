---
title: "Forward Secrecy"
description: "Understanding Perfect Forward Secrecy (PFS) in Geode and why it is critical for long-term data protection."
keywords: ["forward secrecy", "PFS", "perfect forward secrecy", "key rotation", "ephemeral keys", "TLS 1.3", "security"]
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Forward Secrecy

Forward Secrecy is a property of secure communication protocols where compromises of long-term keys do not compromise past session keys. Geode enforces this via TLS 1.3 and robust key rotation policies to protect against future decryption threats.
