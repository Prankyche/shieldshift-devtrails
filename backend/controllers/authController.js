const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");


const SALT_ROUNDS = 12;

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });


const signAndStoreRefreshToken = async (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

  const { exp } = jwt.decode(token);
  const expiresAt = new Date(exp * 1000).toISOString();

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );

  return token;
};


const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};


const register = async (req, res, next) => {
  try {
    const { full_name, phone, password, city, work_type, experience, avg_daily_earnings } =
      req.body;

    const normalizedPhone = phone.replace(/\s/g, "");

    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [normalizedPhone]);
    if (existing.rows.length) {
      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists.",
      });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO users
         (full_name, phone, password_hash, city, work_type, experience, avg_daily_earnings)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        full_name.trim(),
        normalizedPhone,
        password_hash,
        city.trim(),
        work_type,
        experience,
        Number(avg_daily_earnings),
      ]
    );

    const user = rows[0];
    const tokenPayload = { id: user.id, phone: user.phone };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = await signAndStoreRefreshToken(user.id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};


const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\s/g, "") : "";

    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: "A valid phone number is required." });
    }

    const { rows } = await pool.query("SELECT * FROM users WHERE phone = $1", [normalizedPhone]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid phone number or password." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid phone number or password." });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated." });
    }

    const tokenPayload = { id: user.id, phone: user.phone };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = await signAndStoreRefreshToken(user.id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token required." });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
    }

    const { rows } = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [refreshToken]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Refresh token has been revoked." });
    }

    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);

    const newAccessToken = signAccessToken({ id: payload.id });
    const newRefreshToken = await signAndStoreRefreshToken(payload.id);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
};


const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
    }

    return res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
};


const me = async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, data: { user: sanitizeUser(rows[0]) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, me };