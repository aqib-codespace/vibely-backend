import express from "express";
import { verifyTransporter } from "../../utils/emailService.js";

const router = express.Router();

// This route is only available when ALLOW_EMAIL_TEST_ROUTE=true in env
router.get("/email-test", async (req, res) => {
  try {
    const result = await verifyTransporter();
    if (result.ok) {
      return res.status(200).json({ ok: true, message: result.message });
    }
    return res.status(200).json({ ok: false, message: result.message });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || String(err) });
  }
});

export default router;
