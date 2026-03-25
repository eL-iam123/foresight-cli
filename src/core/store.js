import { createHash, randomUUID } from "node:crypto";
import { maxSeverity } from "./severity.js";

export class DeprecationStore {
  constructor(db) {
    this.db = db;
  }

  recordFinding(finding) {
    const fingerprint = createFingerprint(finding);
    const now = finding.detectedAt || new Date().toISOString();
    const metadataJson = serializeJson(finding.metadata || {});

    return this.db.transaction(() => {
      const existing = this.db.get(
        `SELECT * FROM deprecations WHERE fingerprint = ?`,
        [fingerprint]
      );
      let deprecationId = existing?.id;
      let isNew = false;
      let deprecation;

      if (!existing) {
        deprecationId = randomUUID();
        isNew = true;
        this.db.run(
          `
            INSERT INTO deprecations (
              id,
              fingerprint,
              type,
              project,
              module,
              package_name,
              message,
              severity,
              source,
              replacement,
              first_seen_at,
              last_seen_at,
              occurrence_count,
              status,
              metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            deprecationId,
            fingerprint,
            finding.type,
            finding.project,
            finding.module || null,
            finding.packageName || null,
            finding.message,
            finding.severity,
            finding.source,
            finding.replacement || null,
            now,
            now,
            1,
            "open",
            metadataJson
          ]
        );

        deprecation = {
          id: deprecationId,
          fingerprint,
          type: finding.type,
          project: finding.project,
          module: finding.module || null,
          packageName: finding.packageName || null,
          message: finding.message,
          severity: finding.severity,
          source: finding.source,
          replacement: finding.replacement || null,
          firstSeenAt: now,
          lastSeenAt: now,
          occurrenceCount: 1,
          status: "open",
          metadata: finding.metadata || {}
        };
      } else {
        const mergedSeverity = maxSeverity(existing.severity, finding.severity);
        const nextStatus = existing.status === "resolved" ? "open" : existing.status;
        this.db.run(
          `
            UPDATE deprecations
            SET
              last_seen_at = ?,
              occurrence_count = occurrence_count + 1,
              severity = ?,
              replacement = COALESCE(?, replacement),
              metadata_json = ?,
              status = ?
            WHERE fingerprint = ?
          `,
          [
            now,
            mergedSeverity,
            finding.replacement || existing.replacement || null,
            metadataJson,
            nextStatus,
            fingerprint
          ]
        );

        deprecation = {
          id: existing.id,
          fingerprint,
          type: existing.type,
          project: existing.project,
          module: existing.module,
          packageName: existing.package_name,
          message: existing.message,
          severity: mergedSeverity,
          source: existing.source,
          replacement: finding.replacement || existing.replacement || null,
          firstSeenAt: existing.first_seen_at,
          lastSeenAt: now,
          occurrenceCount: Number(existing.occurrence_count) + 1,
          status: nextStatus,
          metadata:
            finding.metadata ||
            (existing.metadata_json ? JSON.parse(existing.metadata_json) : {})
        };
      }

      this.db.run(
        `
          INSERT INTO deprecation_events (
            id,
            deprecation_id,
            detected_at,
            raw_line,
            metadata_json
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          deprecationId,
          now,
          finding.rawLine || null,
          metadataJson
        ]
      );

      return {
        isNew,
        deprecation
      };
    });
  }

  recordAlert(alert) {
    this.db.run(
      `
        INSERT INTO alerts (
          id,
          deprecation_id,
          channel,
          status,
          created_at,
          delivered_at,
          error_message,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        alert.deprecationId,
        alert.channel,
        alert.status,
        alert.createdAt || new Date().toISOString(),
        alert.deliveredAt || null,
        alert.errorMessage || null,
        serializeJson(alert.payload || {})
      ]
    );
  }

  listDeprecations(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.project) {
      clauses.push("project = ?");
      params.push(filters.project);
    }

    if (filters.severity) {
      clauses.push("severity = ?");
      params.push(filters.severity);
    }

    if (filters.type) {
      clauses.push("type = ?");
      params.push(filters.type);
    }

    if (filters.status && filters.status !== "all") {
      clauses.push("status = ?");
      params.push(filters.status);
    }

    const limit = Number.isFinite(filters.limit) ? filters.limit : 25;
    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.db.all(
      `
        SELECT *
        FROM deprecations
        ${whereClause}
        ORDER BY
          CASE severity
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            ELSE 1
          END DESC,
          last_seen_at DESC
        LIMIT ?
      `,
      [...params, limit]
    );

    return rows.map((row) => mapDeprecationRow(row));
  }

  getSummary(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.project) {
      clauses.push("project = ?");
      params.push(filters.project);
    }

    if (filters.severity) {
      clauses.push("severity = ?");
      params.push(filters.severity);
    }

    if (filters.type) {
      clauses.push("type = ?");
      params.push(filters.type);
    }

    if (filters.status && filters.status !== "all") {
      clauses.push("status = ?");
      params.push(filters.status);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const totals = this.db.get(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS high,
          SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) AS medium,
          SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) AS low
        FROM deprecations
        ${whereClause}
      `,
      params
    );

    const byTypeRows = this.db.all(
      `
        SELECT type, COUNT(*) AS count
        FROM deprecations
        ${whereClause}
        GROUP BY type
        ORDER BY count DESC
      `,
      params
    );

    return {
      total: totals?.total || 0,
      high: totals?.high || 0,
      medium: totals?.medium || 0,
      low: totals?.low || 0,
      byType: byTypeRows.reduce((accumulator, row) => {
        accumulator[row.type] = row.count;
        return accumulator;
      }, {})
    };
  }

  listDailyEventCounts(days = 14, project) {
    const params = [
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    ];

    let query = `
      SELECT
        substr(e.detected_at, 1, 10) AS day,
        COUNT(*) AS count
      FROM deprecation_events e
      INNER JOIN deprecations d ON d.id = e.deprecation_id
      WHERE e.detected_at >= ?
    `;

    if (project) {
      query += " AND d.project = ?";
      params.push(project);
    }

    query += `
      GROUP BY substr(e.detected_at, 1, 10)
      ORDER BY day ASC
    `;

    return this.db.all(query, params);
  }

  getDeprecationById(id) {
    const row = this.db.get(`SELECT * FROM deprecations WHERE id = ?`, [id]);
    return row ? mapDeprecationRow(row) : null;
  }

  updateDeprecationStatus({ id, status, project }) {
    const record = project
      ? this.db.get(`SELECT * FROM deprecations WHERE id = ? AND project = ?`, [id, project])
      : this.db.get(`SELECT * FROM deprecations WHERE id = ?`, [id]);

    if (!record) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db.run(
      `
        UPDATE deprecations
        SET
          status = ?,
          metadata_json = ?,
          last_seen_at = ?
        WHERE id = ?
      `,
      [
        status,
        serializeJson({
          ...(record.metadata_json ? JSON.parse(record.metadata_json) : {}),
          triagedAt: updatedAt
        }),
        record.last_seen_at,
        id
      ]
    );

    return this.getDeprecationById(id);
  }

  upsertSubscription(subscription) {
    const now = subscription.updatedAt || new Date().toISOString();
    const existing = this.db.get(
      `
        SELECT *
        FROM subscriptions
        WHERE project = ? AND target_type = ? AND target_name = ?
      `,
      [subscription.project, subscription.targetType, subscription.targetName]
    );

    if (!existing) {
      const id = randomUUID();
      this.db.run(
        `
          INSERT INTO subscriptions (
            id,
            project,
            target_type,
            target_name,
            current_version,
            latest_version,
            notify_email,
            active,
            created_at,
            updated_at,
            last_checked_at,
            last_alerted_at,
            metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          subscription.project,
          subscription.targetType,
          subscription.targetName,
          subscription.currentVersion || null,
          subscription.latestVersion || null,
          subscription.notifyEmail || null,
          subscription.active === false ? 0 : 1,
          now,
          now,
          subscription.lastCheckedAt || null,
          subscription.lastAlertedAt || null,
          serializeJson(subscription.metadata || {})
        ]
      );

      return {
        isNew: true,
        subscription: {
          id,
          project: subscription.project,
          targetType: subscription.targetType,
          targetName: subscription.targetName,
          currentVersion: subscription.currentVersion || null,
          latestVersion: subscription.latestVersion || null,
          notifyEmail: subscription.notifyEmail || null,
          active: subscription.active === false ? false : true,
          createdAt: now,
          updatedAt: now,
          lastCheckedAt: subscription.lastCheckedAt || null,
          lastAlertedAt: subscription.lastAlertedAt || null,
          metadata: subscription.metadata || {}
        }
      };
    }

    this.db.run(
      `
        UPDATE subscriptions
        SET
          current_version = COALESCE(?, current_version),
          latest_version = COALESCE(?, latest_version),
          notify_email = COALESCE(?, notify_email),
          active = ?,
          updated_at = ?,
          metadata_json = ?
        WHERE id = ?
      `,
      [
        subscription.currentVersion || null,
        subscription.latestVersion || null,
        subscription.notifyEmail || null,
        subscription.active === false ? 0 : 1,
        now,
        serializeJson(
          subscription.metadata ||
            (existing.metadata_json ? JSON.parse(existing.metadata_json) : {})
        ),
        existing.id
      ]
    );

    return {
      isNew: false,
      subscription: mapSubscriptionRow(
        this.db.get(`SELECT * FROM subscriptions WHERE id = ?`, [existing.id])
      )
    };
  }

  listSubscriptions(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.project) {
      clauses.push("project = ?");
      params.push(filters.project);
    }

    if (filters.targetType) {
      clauses.push("target_type = ?");
      params.push(filters.targetType);
    }

    if (filters.active !== undefined) {
      clauses.push("active = ?");
      params.push(filters.active ? 1 : 0);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const rows = this.db.all(
      `
        SELECT *
        FROM subscriptions
        ${whereClause}
        ORDER BY project ASC, target_name ASC
      `,
      params
    );

    return rows.map((row) => mapSubscriptionRow(row));
  }

  listActiveSubscriptions(project) {
    return this.listSubscriptions({
      project,
      active: true
    });
  }

  recordSubscriptionCheck(check) {
    const checkedAt = check.checkedAt || new Date().toISOString();
    this.db.run(
      `
        INSERT INTO subscription_checks (
          id,
          subscription_id,
          checked_at,
          status,
          latest_version,
          deprecation_message,
          change_summary,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        check.subscriptionId,
        checkedAt,
        check.status,
        check.latestVersion || null,
        check.deprecationMessage || null,
        check.changeSummary || null,
        serializeJson(check.payload || {})
      ]
    );

    this.db.run(
      `
        UPDATE subscriptions
        SET
          current_version = COALESCE(?, current_version),
          latest_version = COALESCE(?, latest_version),
          last_checked_at = ?,
          updated_at = ?,
          last_alerted_at = COALESCE(?, last_alerted_at)
        WHERE id = ?
      `,
      [
        check.currentVersion || null,
        check.latestVersion || null,
        checkedAt,
        checkedAt,
        check.alertedAt || null,
        check.subscriptionId
      ]
    );
  }
}

function createFingerprint(finding) {
  return createHash("sha256")
    .update(
      [
        finding.type,
        finding.project,
        finding.module || "",
        finding.packageName || "",
        finding.message,
        finding.source
      ].join("|")
    )
    .digest("hex");
}

function serializeJson(value) {
  return JSON.stringify(value ?? {});
}

function mapDeprecationRow(row) {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    type: row.type,
    project: row.project,
    module: row.module,
    packageName: row.package_name,
    message: row.message,
    severity: row.severity,
    source: row.source,
    replacement: row.replacement,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count,
    status: row.status,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
  };
}

function mapSubscriptionRow(row) {
  return {
    id: row.id,
    project: row.project,
    targetType: row.target_type,
    targetName: row.target_name,
    currentVersion: row.current_version,
    latestVersion: row.latest_version,
    notifyEmail: row.notify_email,
    active: Number(row.active) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastCheckedAt: row.last_checked_at,
    lastAlertedAt: row.last_alerted_at,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
  };
}
