const { Router } = require("express");
const { getProfile, updateProfile } = require("../controllers/userController");
const { verifyToken } = require("../middleware/auth");

const router = Router();

// All user routes require authentication
router.use(verifyToken);

// GET  /api/users/profile — fetch current user
router.get("/profile", getProfile);

// PATCH /api/users/profile — update current user
router.patch("/profile", updateProfile);

module.exports = router;