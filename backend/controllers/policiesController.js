const pool = require("../config/db");
const { getActivePolicy, setActivePolicy } = require("./fallbackState");
const { getPremiumPrices, getDefaultPremiumPrices } = require("../services/mlService");

const DEFAULT_PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    slug: "basic",
    base_price: 199,
    period: "month",
    coverage: ["Weather disruption coverage", "Basic accident cover", "24/7 support"],
  },
  {
    id: "standard",
    name: "Standard Plan",
    slug: "standard",
    base_price: 349,
    period: "month",
    coverage: ["Weather disruption coverage", "Traffic incident coverage", "Earning loss protection", "Priority support"],
  },
  {
    id: "premium",
    name: "Premium Plan",
    slug: "premium",
    base_price: 599,
    period: "month",
    coverage: ["Weather disruption coverage", "Traffic incident coverage", "Health & accident cover", "Earning loss protection", "Family coverage add-on", "Dedicated manager"],
  },
];

const nextMonthDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

const findPlanBySlug = (slug) => DEFAULT_PLANS.find((plan) => plan.slug === slug);

const makeFallbackPolicy = (plan) => ({
  id: `fallback-${plan.slug}`,
  status: "active",
  price_paid: plan.base_price,
  started_at: new Date().toISOString(),
  expires_at: nextMonthDate(),
  plan_name: plan.name,
  slug: plan.slug,
  coverage: plan.coverage,
  period: plan.period,
});

const getPlans = async (req, res, next) => {
  try {
    const { city, season, activity_tier, poverty_score } = req.query;

    const { rows } = await pool.query(
      `SELECT id, name, slug, base_price, period, coverage
       FROM plans
       WHERE is_active = TRUE
       ORDER BY base_price ASC`
    );

    let plans = rows;

    // ✅ Keep only ML-supported tiers
    plans = plans.filter((p) =>
      ["basic", "standard", "premium"].includes(p.slug?.toLowerCase())
    );

    try {
      const mlPricing = await getPremiumPrices(
        city || "Mumbai",
        season || "monsoon",
        activity_tier || "high",
        poverty_score || 0.5
      );

      console.log("ML RESPONSE:", JSON.stringify(mlPricing, null, 2));

      plans = plans.map((plan) => {
        const slug = plan.slug?.toLowerCase();

        const weekly =
          mlPricing?.tiers?.[slug]?.weekly_premium ??
          mlPricing?.[slug] ??
          null;

        return {
          ...plan,
          base_price: weekly ? weekly * 4 : plan.base_price,
        };
      });
    } catch (err) {
      console.warn("ML pricing failed, using static prices", err.message);
    }

    console.log("FINAL PLANS:", plans);

    return res.status(200).json({
      success: true,
      data: { plans },
    });
  } catch (err) {
    next(err);
  }
};

const getMyPolicy = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT up.id, up.status, up.price_paid, up.started_at, up.expires_at,
              p.name AS plan_name, p.slug, p.coverage, p.period
       FROM user_policies up
       JOIN plans p ON p.id = up.plan_id
       WHERE up.user_id = $1
         AND up.status = 'active'
       ORDER BY up.started_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const policy = rows[0] || getActivePolicy(req.user.id) || null;

    return res.status(200).json({
      success: true,
      data: { policy },
    });
  } catch (err) {
    if (err?.code === "42P01") {
      return res.status(200).json({
        success: true,
        data: { policy: getActivePolicy(req.user.id) || null },
      });
    }
    next(err);
  }
};

const subscribe = async (req, res, next) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { plan_slug, city, season, activity_tier, poverty_score } = req.body;

    if (!plan_slug) {
      return res.status(400).json({ success: false, message: "plan_slug is required." });
    }

    let plan;
    const planRes = await client.query(
      "SELECT * FROM plans WHERE slug = $1 AND is_active = TRUE",
      [plan_slug]
    );

    if (planRes.rows.length) {
      plan = planRes.rows[0];
    } else {
      plan = findPlanBySlug(plan_slug);
    }

    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found." });
    }

    try {
      const mlPricing = await getPremiumPrices(
        city || "Mumbai",
        season || "monsoon",
        activity_tier || "high",
        poverty_score || 0.5
      );

      const slug = plan.slug?.toLowerCase();

      const weekly =
        mlPricing?.tiers?.[slug]?.weekly_premium ??
        mlPricing?.[slug] ??
        null;

      plan.base_price = weekly ? weekly * 4 : plan.base_price;
    } catch (mlErr) {
      console.warn("ML failed, using default:", mlErr.message);
    }

    await client.query("BEGIN");
    transactionStarted = true;

    await client.query(
      `UPDATE user_policies
       SET status = 'cancelled'
       WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    const { rows } = await client.query(
      `INSERT INTO user_policies (user_id, plan_id, price_paid, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, plan.id, plan.base_price, nextMonthDate()]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: `Subscribed to ${plan.name} successfully.`,
      data: { policy: rows[0] },
    });
  } catch (err) {
    if (transactionStarted) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

const cancelPolicy = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE user_policies
       SET status = 'cancelled'
       WHERE user_id = $1 AND status = 'active'
       RETURNING id`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "No active policy found." });
    }

    return res.status(200).json({ success: true, message: "Policy cancelled." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlans, getMyPolicy, subscribe, cancelPolicy };
// // backend/controllers/policiesController.js
// const pool = require("../config/db");
// const { getActivePolicy, setActivePolicy } = require("./fallbackState");
// const { getPremiumPrices, getDefaultPremiumPrices } = require("../services/mlService");

// const DEFAULT_PLANS = [
//   {
//     id: "basic",
//     name: "Basic Plan",
//     slug: "basic",
//     base_price: 199,
//     period: "month",
//     coverage: ["Weather disruption coverage", "Basic accident cover", "24/7 support"],
//   },
//   {
//     id: "standard",
//     name: "Standard Plan",
//     slug: "standard",
//     base_price: 349,
//     period: "month",
//     coverage: ["Weather disruption coverage", "Traffic incident coverage", "Earning loss protection", "Priority support"],
//   },
//   {
//     id: "premium",
//     name: "Premium Plan",
//     slug: "premium",
//     base_price: 599,
//     period: "month",
//     coverage: ["Weather disruption coverage", "Traffic incident coverage", "Health & accident cover", "Earning loss protection", "Family coverage add-on", "Dedicated manager"],
//   },
//   {
//     id: "gold",
//     name: "Gold Guard",
//     slug: "gold",
//     base_price: 1299,
//     period: "month",
//     coverage: ["All premium coverage", "Legal support", "Higher payout limits", "Fast-track claims"],
//   },
//   {
//     id: "elite",
//     name: "Elite Cover",
//     slug: "elite",
//     base_price: 1999,
//     period: "month",
//     coverage: ["Unlimited claims", "24/7 concierge support", "Travel protection", "Personalized risk advice"],
//   },
// ];

// // ─── helpers ────────────────────────────────────────────────────

// /**
//  * Returns the next calendar month's due date (same day, next month).
//  */
// const nextMonthDate = () => {
//   const d = new Date();
//   d.setMonth(d.getMonth() + 1);
//   return d.toISOString();
// };

// const findPlanBySlug = (slug) => DEFAULT_PLANS.find((plan) => plan.slug === slug);

// const makeFallbackPolicy = (plan) => ({
//   id: `fallback-${plan.slug}`,
//   status: "active",
//   price_paid: plan.base_price,
//   started_at: new Date().toISOString(),
//   expires_at: nextMonthDate(),
//   plan_name: plan.name,
//   slug: plan.slug,
//   coverage: plan.coverage,
//   period: plan.period,
// });

// // ─── controllers ────────────────────────────────────────────────

// /**
//  * GET /api/policies/plans
//  * Returns all active plans (with prices).
//  * Public — no auth required.
//  */
// const getPlans = async (req, res, next) => {
//   try {
//     const { city, season, activity_tier, poverty_score } = req.query;

//     const { rows } = await pool.query(
//       `SELECT id, name, slug, base_price, period, coverage
//        FROM plans
//        WHERE is_active = TRUE
//        ORDER BY base_price ASC`
//     );

//     let plans = rows;

//     try {
//       const mlPricing = await getPremiumPrices(
//         city || "Mumbai",
//         season || "monsoon",
//         activity_tier || "high",
//         poverty_score || 0.5
//       );

//       plans = plans.map((plan) => ({
//         ...plan,
//         base_price: (mlPricing[plan.slug] || plan.base_price) * 4,
//       }));
//     } catch (err) {
//       console.warn("ML pricing failed, using static prices");
//     }
//     console.log("FINAL", plans);
//     return res.status(200).json({ success: true, data: { plans } });
//   } catch (err) {
//     next(err);
//   }
// };

// /**
//  * GET /api/policies/my
//  * Returns the current user's active policy (if any).
//  */
// const getMyPolicy = async (req, res, next) => {
//   try {
//     const { rows } = await pool.query(
//       `SELECT up.id, up.status, up.price_paid, up.started_at, up.expires_at,
//               p.name AS plan_name, p.slug, p.coverage, p.period
//        FROM user_policies up
//        JOIN plans p ON p.id = up.plan_id
//        WHERE up.user_id = $1
//          AND up.status = 'active'
//        ORDER BY up.started_at DESC
//        LIMIT 1`,
//       [req.user.id]
//     );

//     const policy = rows[0] || getActivePolicy(req.user.id) || null;
//     return res.status(200).json({
//       success: true,
//       data: { policy },
//     });
//   } catch (err) {
//     if (err && err.code === "42P01" && err.message && err.message.includes("user_policies")) {
//       return res.status(200).json({
//         success: true,
//         data: { policy: getActivePolicy(req.user.id) || null },
//       });
//     }
//     next(err);
//   }
// };

// /**
//  * POST /api/policies/subscribe
//  * Body: { plan_slug: 'basic' | 'standard' | 'premium', city?, season?, activity_tier?, poverty_score? }
//  * Subscribes the user to a plan with ML-based pricing, cancelling any existing active policy first.
//  */
// const subscribe = async (req, res, next) => {
//   const client = await pool.connect();
//   let transactionStarted = false;

//   try {
//     const { plan_slug, city, season, activity_tier, poverty_score } = req.body;

//     if (!plan_slug) {
//       return res.status(400).json({ success: false, message: "plan_slug is required." });
//     }

//     let plan;
//     try {
//       const planRes = await client.query(
//         "SELECT * FROM plans WHERE slug = $1 AND is_active = TRUE",
//         [plan_slug]
//       );
//       if (planRes.rows.length) {
//         plan = planRes.rows[0];
//       }
//     } catch (err) {
//       if (!(err && err.code === "42P01" && err.message && err.message.includes("plans"))) {
//         throw err;
//       }
//     }

//     if (!plan) {
//       plan = findPlanBySlug(plan_slug);
//     }

//     if (!plan) {
//       return res.status(404).json({ success: false, message: "Plan not found." });
//     }

//     // ✅ Get ML-based pricing
//     let mlPricing;
//     try {
//       mlPricing = await getPremiumPrices(
//         city || "Mumbai",
//         season || "monsoon",
//         activity_tier || "high",
//         poverty_score || 0.5
//       );
//       plan.base_price = (mlPricing[plan.slug] || plan.base_price)*4;
//     } catch (mlErr) {
//       console.warn("ML service unavailable, using default pricing:", mlErr.message);
//       try {
//         mlPricing = await getDefaultPremiumPrices();
//         plan.base_price = mlPricing[plan.slug] || plan.base_price;
//       } catch {
//         console.warn("ML service completely unavailable, falling back to hardcoded prices");
//       }
//     }

//     try {
//       await client.query("BEGIN");
//       transactionStarted = true;

//       await client.query(
//         `UPDATE user_policies
//          SET status = 'cancelled'
//          WHERE user_id = $1 AND status = 'active'`,
//         [req.user.id]
//       );

//       const { rows } = await client.query(
//         `INSERT INTO user_policies (user_id, plan_id, price_paid, expires_at)
//          VALUES ($1, $2, $3, $4)
//          RETURNING *`,
//         [req.user.id, plan.id, plan.base_price, nextMonthDate()]
//       );

//       await client.query("COMMIT");
//       transactionStarted = false;

//       return res.status(201).json({
//         success: true,
//         message: `Subscribed to ${plan.name} successfully.`,
//         data: { policy: rows[0] },
//       });
//     } catch (err) {
//       if (transactionStarted) {
//         await client.query("ROLLBACK");
//       }
//       if (err && err.code === "42P01" && err.message && err.message.includes("user_policies")) {
//         const fallbackPolicy = makeFallbackPolicy(plan);
//         setActivePolicy(req.user.id, fallbackPolicy);
//         return res.status(201).json({
//           success: true,
//           message: `Subscribed to ${plan.name} successfully.`,
//           data: { policy: fallbackPolicy },
//         });
//       }
//       throw err;
//     }
//   } catch (err) {
//     if (err && err.code === "42P01" && err.message && (err.message.includes("plans") || err.message.includes("user_policies"))) {
//       const plan = findPlanBySlug(req.body.plan_slug);
//       if (plan) {
//         const fallbackPolicy = makeFallbackPolicy(plan);
//         setActivePolicy(req.user.id, fallbackPolicy);
//         return res.status(201).json({
//           success: true,
//           message: `Subscribed to ${plan.name} successfully.`,
//           data: { policy: fallbackPolicy },
//         });
//       }
//     }
//     next(err);
//   } finally {
//     client.release();
//   }
// };

// /**
//  * DELETE /api/policies/cancel
//  * Cancels the user's current active policy.
//  */
// const cancelPolicy = async (req, res, next) => {
//   try {
//     const { rows } = await pool.query(
//       `UPDATE user_policies
//        SET status = 'cancelled'
//        WHERE user_id = $1 AND status = 'active'
//        RETURNING id`,
//       [req.user.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ success: false, message: "No active policy found." });
//     }

//     return res.status(200).json({ success: true, message: "Policy cancelled." });
//   } catch (err) {
//     next(err);
//   }
// };

// module.exports = { getPlans, getMyPolicy, subscribe, cancelPolicy };
// // const pool = require("../config/db");
// // const { getActivePolicy, setActivePolicy } = require("./fallbackState");
// // const { getPremiumPrices, getDefaultPremiumPrices } = require("../services/mlService");

// // const DEFAULT_PLANS = [
// //   {
// //     id: "basic",
// //     name: "Basic Plan",
// //     slug: "basic",
// //     base_price: 199,
// //     period: "month",
// //     coverage: ["Weather disruption coverage", "Basic accident cover", "24/7 support"],
// //   },
// //   {
// //     id: "standard",
// //     name: "Standard Plan",
// //     slug: "standard",
// //     base_price: 349,
// //     period: "month",
// //     coverage: ["Weather disruption coverage", "Traffic incident coverage", "Earning loss protection", "Priority support"],
// //   },
// //   {
// //     id: "premium",
// //     name: "Premium Plan",
// //     slug: "premium",
// //     base_price: 599,
// //     period: "month",
// //     coverage: ["Weather disruption coverage", "Traffic incident coverage", "Health & accident cover", "Earning loss protection", "Family coverage add-on", "Dedicated manager"],
// //   },
// //   {
// //     id: "gold",
// //     name: "Gold Guard",
// //     slug: "gold",
// //     base_price: 1299,
// //     period: "month",
// //     coverage: ["All premium coverage", "Legal support", "Higher payout limits", "Fast-track claims"],
// //   },
// //   {
// //     id: "elite",
// //     name: "Elite Cover",
// //     slug: "elite",
// //     base_price: 1999,
// //     period: "month",
// //     coverage: ["Unlimited claims", "24/7 concierge support", "Travel protection", "Personalized risk advice"],
// //   },
// // ];

// // // ─── helpers ────────────────────────────────────────────────────

// // /**
// //  * Returns the next calendar month's due date (same day, next month).
// //  */
// // const nextMonthDate = () => {
// //   const d = new Date();
// //   d.setMonth(d.getMonth() + 1);
// //   return d.toISOString();
// // };

// // const findPlanBySlug = (slug) => DEFAULT_PLANS.find((plan) => plan.slug === slug);

// // const makeFallbackPolicy = (plan) => ({
// //   id: `fallback-${plan.slug}`,
// //   status: "active",
// //   price_paid: plan.base_price,
// //   started_at: new Date().toISOString(),
// //   expires_at: nextMonthDate(),
// //   plan_name: plan.name,
// //   slug: plan.slug,
// //   coverage: plan.coverage,
// //   period: plan.period,
// // });

// // // ─── controllers ────────────────────────────────────────────────

// // /**
// //  * GET /api/policies/plans
// //  * Returns all active plans (with prices).
// //  * Public — no auth required.
// //  */
// // const getPlans = async (req, res, next) => {
// //   try {
// //     const { rows } = await pool.query(
// //       `SELECT id, name, slug, base_price, period, coverage
// //        FROM plans
// //        WHERE is_active = TRUE
// //        ORDER BY base_price ASC`
// //     );

// //     return res.status(200).json({ success: true, data: { plans: rows } });
// //   } catch (err) {
// //     if (err && err.code === "42P01" && err.message && err.message.includes("plans")) {
// //       return res.status(200).json({ success: true, data: { plans: DEFAULT_PLANS } });
// //     }
// //     next(err);
// //   }
// // };

// // /**
// //  * GET /api/policies/my
// //  * Returns the current user's active policy (if any).
// //  */
// // const getMyPolicy = async (req, res, next) => {
// //   try {
// //     const { rows } = await pool.query(
// //       `SELECT up.id, up.status, up.price_paid, up.started_at, up.expires_at,
// //               p.name AS plan_name, p.slug, p.coverage, p.period
// //        FROM user_policies up
// //        JOIN plans p ON p.id = up.plan_id
// //        WHERE up.user_id = $1
// //          AND up.status = 'active'
// //        ORDER BY up.started_at DESC
// //        LIMIT 1`,
// //       [req.user.id]
// //     );

// //     const policy = rows[0] || getActivePolicy(req.user.id) || null;
// //     return res.status(200).json({
// //       success: true,
// //       data: { policy },
// //     });
// //   } catch (err) {
// //     if (err && err.code === "42P01" && err.message && err.message.includes("user_policies")) {
// //       return res.status(200).json({
// //         success: true,
// //         data: { policy: getActivePolicy(req.user.id) || null },
// //       });
// //     }
// //     next(err);
// //   }
// // };

// // /**
// //  * POST /api/policies/subscribe
// //  * Body: { plan_slug: 'basic' | 'standard' | 'premium' }
// //  * Subscribes the user to a plan, cancelling any existing active policy first.
// //  */
// // const subscribe = async (req, res, next) => {
// //   const client = await pool.connect();
// //   let transactionStarted = false;

// //   try {
// //     const { plan_slug } = req.body;

// //     if (!plan_slug) {
// //       return res.status(400).json({ success: false, message: "plan_slug is required." });
// //     }

// //     let plan;
// //     try {
// //       const planRes = await client.query(
// //         "SELECT * FROM plans WHERE slug = $1 AND is_active = TRUE",
// //         [plan_slug]
// //       );
// //       if (planRes.rows.length) {
// //         plan = planRes.rows[0];
// //       }
// //     } catch (err) {
// //       if (!(err && err.code === "42P01" && err.message && err.message.includes("plans"))) {
// //         throw err;
// //       }
// //     }

// //     if (!plan) {
// //       plan = findPlanBySlug(plan_slug);
// //     }

// //     if (!plan) {
// //       return res.status(404).json({ success: false, message: "Plan not found." });
// //     }

// //     try {
// //       await client.query("BEGIN");
// //       transactionStarted = true;

// //       await client.query(
// //         `UPDATE user_policies
// //          SET status = 'cancelled'
// //          WHERE user_id = $1 AND status = 'active'`,
// //         [req.user.id]
// //       );

// //       const { rows } = await client.query(
// //         `INSERT INTO user_policies (user_id, plan_id, price_paid, expires_at)
// //          VALUES ($1, $2, $3, $4)
// //          RETURNING *`,
// //         [req.user.id, plan.id, plan.base_price, nextMonthDate()]
// //       );

// //       await client.query("COMMIT");
// //       transactionStarted = false;

// //       return res.status(201).json({
// //         success: true,
// //         message: `Subscribed to ${plan.name} successfully.`,
// //         data: { policy: rows[0] },
// //       });
// //     } catch (err) {
// //       if (transactionStarted) {
// //         await client.query("ROLLBACK");
// //       }
// //       if (err && err.code === "42P01" && err.message && err.message.includes("user_policies")) {
// //         const fallbackPolicy = makeFallbackPolicy(plan);
// //         setActivePolicy(req.user.id, fallbackPolicy);
// //         return res.status(201).json({
// //           success: true,
// //           message: `Subscribed to ${plan.name} successfully.`,
// //           data: { policy: fallbackPolicy },
// //         });
// //       }
// //       throw err;
// //     }
// //   } catch (err) {
// //     if (err && err.code === "42P01" && err.message && (err.message.includes("plans") || err.message.includes("user_policies"))) {
// //       const plan = findPlanBySlug(req.body.plan_slug);
// //       if (plan) {
// //         const fallbackPolicy = makeFallbackPolicy(plan);
// //         setActivePolicy(req.user.id, fallbackPolicy);
// //         return res.status(201).json({
// //           success: true,
// //           message: `Subscribed to ${plan.name} successfully.`,
// //           data: { policy: fallbackPolicy },
// //         });
// //       }
// //     }
// //     next(err);
// //   } finally {
// //     client.release();
// //   }
// // };

// // /**
// //  * DELETE /api/policies/cancel
// //  * Cancels the user's current active policy.
// //  */
// // const cancelPolicy = async (req, res, next) => {
// //   try {
// //     const { rows } = await pool.query(
// //       `UPDATE user_policies
// //        SET status = 'cancelled'
// //        WHERE user_id = $1 AND status = 'active'
// //        RETURNING id`,
// //       [req.user.id]
// //     );

// //     if (!rows.length) {
// //       return res.status(404).json({ success: false, message: "No active policy found." });
// //     }

// //     return res.status(200).json({ success: true, message: "Policy cancelled." });
// //   } catch (err) {
// //     next(err);
// //   }
// // };

// // module.exports = { getPlans, getMyPolicy, subscribe, cancelPolicy };