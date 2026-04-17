const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const SALT_ROUNDS = 12;

const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};


const getProfile = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, data: { user: sanitizeUser(rows[0]) } });
  } catch (err) {
    next(err);
  }
};


const updateProfile = async (req, res, next) => {
  try {
    const allowed = ["full_name", "city", "work_type", "experience", "avg_daily_earnings"];
    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No updatable fields provided." });
    }

    const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`);
    const values = [...Object.values(updates), req.user.id];

    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user: sanitizeUser(rows[0]) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/settings/password
 * Body: { current_password, new_password }
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "current_password and new_password are required.",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "new_password must be at least 6 characters.",
      });
    }

    const { rows } = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [password_hash, req.user.id]
    );

    // Revoke all refresh tokens so all other sessions are logged out
    await pool.query(
      "DELETE FROM refresh_tokens WHERE user_id = $1",
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Password changed. Please log in again.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, changePassword };