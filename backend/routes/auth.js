const { Router } = require("express");
const { register, login, refresh, logout, me } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../middleware/validate");

const router = Router();


router.post("/register", validateRegister, register);


router.post("/login", validateLogin, login);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.get("/me", verifyToken, me);

module.exports = router;