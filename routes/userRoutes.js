const express = require("express");
const router = express.Router();
const {
    completeProfile,
    getProfileDetails,
    getPatientById,
    updateCompletionStatus,
    getPatients,
    getDoctors,
    updateProfile,
    uploadTreatmentFile
} = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post(
    "/profile/complete",
    authMiddleware,
    upload.fields([
        { name: "profilePicUrl", maxCount: 1 },
        { name: "treatmentFileUrl", maxCount: 1 },
        { name: "proofFileUrl", maxCount: 1 }
    ]),
    completeProfile
);

router.get("/profile/details", authMiddleware, getProfileDetails);
router.patch("/profile/update-completion", authMiddleware, updateCompletionStatus);
router.patch("/profile/update", authMiddleware, updateProfile);
router.post("/profile/upload-treatment", authMiddleware, upload.single("treatmentFile"), uploadTreatmentFile);

router.get("/patients", authMiddleware, getPatients);
router.get("/patients/:id", authMiddleware, getPatientById);

router.get("/doctors", authMiddleware, getDoctors);

module.exports = router;
