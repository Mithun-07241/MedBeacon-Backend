const { z } = require("zod");

// Profile completion schema
const completeProfileSchema = z.object({
    role: z.enum(["patient", "doctor"]),
    dateOfBirth: z.string().min(1),
    phoneNumber: z.string().min(1),
    address: z.string().min(1),
    medicalLicense: z.string().optional(),
    specialization: z.string().optional(),
    hospitalAffiliation: z.string().optional(),
    identityDocumentUrl: z.string().optional(),
    allergies: z.string().optional(),
    gender: z.string().optional(),
    experience: z.string().optional()
});

const insertSymptomSchema = z.object({
    description: z.string(),
    severity: z.string()
});

const insertAlertSchema = z.object({
    patientId: z.string().uuid().optional(),
    doctorId: z.string().uuid().optional(),
    message: z.string(),
    severity: z.string()
});

const insertMetricSchema = z.object({
    heartRate: z.number().optional(),
    temperature: z.string().optional(),
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional()
});

module.exports = {
    completeProfileSchema,
    insertSymptomSchema,
    insertAlertSchema,
    insertMetricSchema
};
