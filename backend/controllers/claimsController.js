// backend/controllers/claimsController.js
const pool = require("../config/db");
const { getActivePolicy, getClaims, addClaim } = require("./fallbackState");
const { evaluateFraud } = require("../services/mlService");

// ─── helpers ────────────────────────────────────────────────────

/**
 * Generates a unique claim reference like CLM-2026-001
 */
const generateClaimRef = async (client) => {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT COUNT(*) FROM claims WHERE claim_ref LIKE $1`,
    [`CLM-${year}-%`]
  );
  const seq = String(Number(rows[0].count) + 1).padStart(3, "0");
  return `CLM-${year}-${seq}`;
};

const generateClaimRefFallback = async (userId) => {
  const year = new Date().getFullYear();
  const fallbackClaims = getClaims(userId);
  const seq = String(fallbackClaims.length + 1).padStart(3, "0");
  return `CLM-${year}-${seq}`;
};

// ─── controllers ────────────────────────────────────────────────

/**
 * GET /api/claims
 * Returns all claims for the current user, newest first.
 */
const getMyClaims = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, claim_ref, event_type, area, duration_hrs,
              est_payout, status, notes, created_at
       FROM claims
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: { claims: rows } });
  } catch (err) {
    if (err && err.code === "42P01" && err.message && err.message.includes("claims")) {
      return res.status(200).json({ success: true, data: { claims: getClaims(req.user.id) } });
    }
    next(err);
  }
};

/**
 * GET /api/claims/active
 * Returns the single active (pending/processing) claim if any.
 */
const getActiveClaim = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, claim_ref, event_type, area, duration_hrs,
              est_payout, status, notes, created_at
       FROM claims
       WHERE user_id = $1
         AND status IN ('pending', 'processing')
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: { claim: rows[0] || null },
    });
  } catch (err) {
    if (err && err.code === "42P01" && err.message && err.message.includes("claims")) {
      const fallbackClaim = getClaims(req.user.id).find((claim) =>
        claim.status === "pending" || claim.status === "processing"
      );
      return res.status(200).json({ success: true, data: { claim: fallbackClaim || null } });
    }
    next(err);
  }
};

/**
 * GET /api/claims/:id
 * Returns a single claim by ID (must belong to the user).
 */
const getClaimById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM claims WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Claim not found." });
    }

    return res.status(200).json({ success: true, data: { claim: rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/claims
 * Body: { event_type?, area?, duration_hrs?, est_payout?, notes? }
 * Submits a new claim for the user and runs ML fraud detection asynchronously.
 */
const createClaim = async (req, res, next) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      event_type = "Weather Disruption",
      area,
      duration_hrs,
      est_payout,
      notes,
    } = req.body;

    let policyId = null;
    let activePolicy = null;

    try {
      const policyRes = await client.query(
        `SELECT id FROM user_policies
         WHERE user_id = $1 AND status = 'active'
         LIMIT 1`,
        [req.user.id]
      );
      if (policyRes.rows.length) {
        policyId = policyRes.rows[0].id;
      }
    } catch (err) {
      if (!(err && err.code === "42P01" && err.message && err.message.includes("user_policies"))) {
        throw err;
      }
      activePolicy = getActivePolicy(req.user.id);
    }

    if (!policyId && !activePolicy) {
      return res.status(400).json({
        success: false,
        message: "You need an active policy to submit a claim.",
      });
    }

    try {
      const activeRes = await client.query(
        `SELECT id FROM claims
         WHERE user_id = $1 AND status IN ('pending', 'processing')`,
        [req.user.id]
      );
      if (activeRes.rows.length) {
        return res.status(409).json({
          success: false,
          message: "You already have an active claim in progress.",
        });
      }
    } catch (err) {
      if (!(err && err.code === "42P01" && err.message && err.message.includes("claims"))) {
        throw err;
      }
      const fallbackActive = getClaims(req.user.id).some((claim) =>
        claim.status === "pending" || claim.status === "processing"
      );
      if (fallbackActive) {
        return res.status(409).json({
          success: false,
          message: "You already have an active claim in progress.",
        });
      }
    }

    let claimRef;
    try {
      claimRef = await generateClaimRef(client);
    } catch (err) {
      if (err && err.code === "42P01" && err.message && err.message.includes("claims")) {
        const fallbackRef = await generateClaimRefFallback(req.user.id);
        const fallbackClaim = {
          id: `fallback-${Date.now()}`,
          claim_ref: fallbackRef,
          event_type,
          area: area || null,
          duration_hrs: duration_hrs || null,
          est_payout: est_payout || null,
          status: "pending",
          notes: notes || null,
          created_at: new Date().toISOString(),
        };
        addClaim(req.user.id, fallbackClaim);
        return res.status(201).json({
          success: true,
          message: "Claim submitted successfully.",
          data: { claim: fallbackClaim },
        });
      }
      throw err;
    }

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const { rows } = await client.query(
        `INSERT INTO claims
           (user_id, policy_id, claim_ref, event_type, area, duration_hrs, est_payout, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          req.user.id,
          policyId,
          claimRef,
          event_type,
          area || null,
          duration_hrs || null,
          est_payout || null,
          notes || null,
        ]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      // ✅ Run fraud detection asynchronously (don't block response)
      setImmediate(async () => {
        try {
          const fraudResult = await evaluateFraud({
            claim_id: rows[0].id,
            event_type,
            area,
            duration_hrs,
            est_payout,
          });
          console.log(`Fraud detection completed for claim ${rows[0].id}:`, fraudResult);
          // Optionally: update claim status based on fraud score if needed
        } catch (fraudErr) {
          console.warn(`Fraud detection failed for claim ${rows[0].id}:`, fraudErr.message);
        }
      });

      return res.status(201).json({
        success: true,
        message: "Claim submitted successfully.",
        data: { claim: rows[0] },
      });
    } catch (err) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
      }
      throw err;
    }
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getMyClaims, getActiveClaim, getClaimById, createClaim };
// const pool = require("../config/db");
// const { getActivePolicy, getClaims, addClaim } = require("./fallbackState");
// const { evaluateFraud, simulateEvent } = require("../services/mlService");

// // ─── helpers ────────────────────────────────────────────────────

// /**
//  * Generates a unique claim reference like CLM-2026-001
//  */
// const generateClaimRef = async (client) => {
//   const year = new Date().getFullYear();
//   const { rows } = await client.query(
//     `SELECT COUNT(*) FROM claims WHERE claim_ref LIKE $1`,
//     [`CLM-${year}-%`]
//   );
//   const seq = String(Number(rows[0].count) + 1).padStart(3, "0");
//   return `CLM-${year}-${seq}`;
// };

// const generateClaimRefFallback = async (userId) => {
//   const year = new Date().getFullYear();
//   const fallbackClaims = getClaims(userId);
//   const seq = String(fallbackClaims.length + 1).padStart(3, "0");
//   return `CLM-${year}-${seq}`;
// };

// // ─── controllers ────────────────────────────────────────────────

// /**
//  * GET /api/claims
//  * Returns all claims for the current user, newest first.
//  */
// const getMyClaims = async (req, res, next) => {
//   try {
//     const { rows } = await pool.query(
//       `SELECT id, claim_ref, event_type, area, duration_hrs,
//               est_payout, status, notes, created_at
//        FROM claims
//        WHERE user_id = $1
//        ORDER BY created_at DESC`,
//       [req.user.id]
//     );

//     return res.status(200).json({ success: true, data: { claims: rows } });
//   } catch (err) {
//     if (err && err.code === "42P01" && err.message && err.message.includes("claims")) {
//       return res.status(200).json({ success: true, data: { claims: getClaims(req.user.id) } });
//     }
//     next(err);
//   }
// };

// /**
//  * GET /api/claims/active
//  * Returns the single active (pending/processing) claim if any.
//  */
// const getActiveClaim = async (req, res, next) => {
//   try {
//     const { rows } = await pool.query(
//       `SELECT id, claim_ref, event_type, area, duration_hrs,
//               est_payout, status, notes, created_at
//        FROM claims
//        WHERE user_id = $1
//          AND status IN ('pending', 'processing')
//        ORDER BY created_at DESC
//        LIMIT 1`,
//       [req.user.id]
//     );

//     return res.status(200).json({
//       success: true,
//       data: { claim: rows[0] || null },
//     });
//   } catch (err) {
//     if (err && err.code === "42P01" && err.message && err.message.includes("claims")) {
//       const fallbackClaim = getClaims(req.user.id).find((claim) =>
//         claim.status === "pending" || claim.status === "processing"
//       );
//       return res.status(200).json({ success: true, data: { claim: fallbackClaim || null } });
//     }
//     next(err);
//   }
// };

// /**
//  * GET /api/claims/:id
//  * Returns a single claim by ID (must belong to the user).
//  */
// const getClaimById = async (req, res, next) => {
//   try {
//     const { rows } = await pool.query(
//       `SELECT * FROM claims WHERE id = $1 AND user_id = $2`,
//       [req.params.id, req.user.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ success: false, message: "Claim not found." });
//     }

//     return res.status(200).json({ success: true, data: { claim: rows[0] } });
//   } catch (err) {
//     next(err);
//   }
// };

// /**
//  * POST /api/claims
//  * Body: { event_type?, area?, duration_hrs?, est_payout?, notes? }
//  * Submits a new claim for the user.
//  */
// const createClaim = async (req, res, next) => {
//   const client = await pool.connect();
//   let transactionStarted = false;

//   try {
//     const {
//       event_type = "Weather Disruption",
//       area,
//       duration_hrs,
//       est_payout,
//       notes,
//     } = req.body;

//     let policyId = null;
//     let activePolicy = null;

//     try {
//       const policyRes = await client.query(
//         `SELECT id FROM user_policies
//          WHERE user_id = $1 AND status = 'active'
//          LIMIT 1`,
//         [req.user.id]
//       );
//       if (policyRes.rows.length) {
//         policyId = policyRes.rows[0].id;
//       }
//     } catch (err) {
//       if (!(err && err.code === "42P01" && err.message && err.message.includes("user_policies"))) {
//         throw err;
//       }
//       activePolicy = getActivePolicy(req.user.id);
//     }

//     if (!policyId && !activePolicy) {
//       return res.status(400).json({
//         success: false,
//         message: "You need an active policy to submit a claim.",
//       });
//     }

//     try {
//       const activeRes = await client.query(
//         `SELECT id FROM claims
//          WHERE user_id = $1 AND status IN ('pending', 'processing')`,
//         [req.user.id]
//       );
//       if (activeRes.rows.length) {
//         return res.status(409).json({
//           success: false,
//           message: "You already have an active claim in progress.",
//         });
//       }
//     } catch (err) {
//       if (!(err && err.code === "42P01" && err.message && err.message.includes("claims"))) {
//         throw err;
//       }
//       const fallbackActive = getClaims(req.user.id).some((claim) =>
//         claim.status === "pending" || claim.status === "processing"
//       );
//       if (fallbackActive) {
//         return res.status(409).json({
//           success: false,
//           message: "You already have an active claim in progress.",
//         });
//       }
//     }

//     let claimRef;
//     try {
//       claimRef = await generateClaimRef(client);
//     } catch (err) {
//       if (err && err.code === "42P01" && err.message && err.message.includes("claims")) {
//         const fallbackRef = await generateClaimRefFallback(req.user.id);
//         const fallbackClaim = {
//           id: `fallback-${Date.now()}`,
//           claim_ref: fallbackRef,
//           event_type,
//           area: area || null,
//           duration_hrs: duration_hrs || null,
//           est_payout: est_payout || null,
//           status: "pending",
//           notes: notes || null,
//           created_at: new Date().toISOString(),
//         };
//         addClaim(req.user.id, fallbackClaim);
//         return res.status(201).json({
//           success: true,
//           message: "Claim submitted successfully.",
//           data: { claim: fallbackClaim },
//         });
//       }
//       throw err;
//     }

//     try {
//       await client.query("BEGIN");
//       transactionStarted = true;

//       const { rows } = await client.query(
//         `INSERT INTO claims
//            (user_id, policy_id, claim_ref, event_type, area, duration_hrs, est_payout, notes)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//          RETURNING *`,
//         [
//           req.user.id,
//           policyId,
//           claimRef,
//           event_type,
//           area || null,
//           duration_hrs || null,
//           est_payout || null,
//           notes || null,
//         ]
//       );

//       await client.query("COMMIT");
//       transactionStarted = false;

//       return res.status(201).json({
//         success: true,
//         message: "Claim submitted successfully.",
//         data: { claim: rows[0] },
//       });
//     } catch (err) {
//       if (transactionStarted) {
//         await client.query("ROLLBACK");
//       }
//       throw err;
//     }
//   } catch (err) {
//     next(err);
//   } finally {
//     client.release();
//   }
// };

// module.exports = { getMyClaims, getActiveClaim, getClaimById, createClaim };