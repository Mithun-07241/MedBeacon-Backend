/**
 * Comprehensive validation utilities for MedBeacon application
 */

// UUID Validators
function isValidSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
}

function isValidUserId(userId) {
    if (!userId || typeof userId !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
}

function isValidDoctorId(doctorId) {
    return isValidUserId(doctorId);
}

// User Data Validators
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim()) && email.length <= 255;
}

function isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^\+?[0-9]{10,15}$/.test(cleaned);
}

function isValidName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return /^[a-zA-Z\s\-']{1,50}$/.test(trimmed);
}

function isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    return /^[a-zA-Z0-9_-]{3,30}$/.test(username.trim());
}

// Date/Time Validators
function isValidDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

function isValidDateOfBirth(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    const age = (today - date) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 0 && age <= 150 && date < today;
}

function isValidTime(timeString) {
    if (!timeString || typeof timeString !== 'string') return false;
    const time12Regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM|am|pm)$/;
    const time24Regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return time12Regex.test(timeString) || time24Regex.test(timeString);
}

// Content Validators
function isValidReason(reason) {
    if (!reason || typeof reason !== 'string') return false;
    const trimmed = reason.trim();
    return trimmed.length >= 2 && trimmed.length <= 200;
}

function isValidSessionTitle(title) {
    if (!title || typeof title !== 'string') return false;
    const trimmed = title.trim();
    return trimmed.length >= 1 && trimmed.length <= 100;
}

function isValidMessage(message) {
    if (!message || typeof message !== 'string') return false;
    const trimmed = message.trim();
    return trimmed.length >= 1 && trimmed.length <= 5000;
}

function isValidNumber(value, min = -Infinity, max = Infinity) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
}

function isValidFileUpload(file, allowedTypes = [], maxSizeMB = 10) {
    if (!file) return { isValid: false, error: 'No file provided' };
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }
    if (allowedTypes.length > 0) {
        const fileType = file.mimetype || file.type;
        if (!allowedTypes.includes(fileType)) {
            return { isValid: false, error: `File type must be one of: ${allowedTypes.join(', ')}` };
        }
    }
    return { isValid: true };
}

// Sanitization
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '').substring(0, 5000);
}

// Complex Validators
function validateBookingParams(params) {
    const errors = [];
    if (!params.doctorId || !isValidDoctorId(params.doctorId)) errors.push('Invalid doctor ID format');
    if (!params.date || !isValidDate(params.date)) errors.push('Invalid date format or date is in the past');
    if (!params.time || !isValidTime(params.time)) errors.push('Invalid time format');
    if (!params.reason || !isValidReason(params.reason)) errors.push('Reason must be between 2 and 200 characters');
    if (params.notes && typeof params.notes === 'string' && params.notes.length > 500) errors.push('Notes must be less than 500 characters');

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            doctorId: params.doctorId,
            date: params.date,
            time: params.time,
            reason: sanitizeString(params.reason),
            notes: params.notes ? sanitizeString(params.notes) : ''
        }
    };
}

function validateSearchParams(params) {
    const errors = [];
    if (params.specialization && typeof params.specialization !== 'string') errors.push('Specialization must be a string');
    if (params.name && typeof params.name !== 'string') errors.push('Name must be a string');
    if (params.availability && !['available', 'unavailable'].includes(params.availability)) errors.push('Availability must be "available" or "unavailable"');

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            specialization: params.specialization ? sanitizeString(params.specialization) : undefined,
            name: params.name ? sanitizeString(params.name) : undefined,
            availability: params.availability
        }
    };
}

function validateRegistration(data) {
    const errors = [];
    if (!isValidUsername(data.username)) errors.push('Username must be 3-30 characters, alphanumeric, underscores, or hyphens only');
    if (!isValidEmail(data.email)) errors.push('Invalid email format');
    if (!isValidPassword(data.password)) errors.push('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
    if (!['patient', 'doctor'].includes(data.role)) errors.push('Role must be either "patient" or "doctor"');

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            username: sanitizeString(data.username),
            email: data.email.trim().toLowerCase(),
            password: data.password,
            role: data.role
        }
    };
}

function validateProfileUpdate(data, role) {
    const errors = [];

    if (data.firstName && !isValidName(data.firstName)) errors.push('Invalid first name');
    if (data.lastName && !isValidName(data.lastName)) errors.push('Invalid last name');
    if (data.phone && !isValidPhone(data.phone)) errors.push('Invalid phone number');
    if (data.dateOfBirth && !isValidDateOfBirth(data.dateOfBirth)) errors.push('Invalid date of birth');
    if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) errors.push('Gender must be Male, Female, or Other');

    if (role === 'doctor') {
        if (data.specialization && typeof data.specialization !== 'string') errors.push('Invalid specialization');
        if (data.experience && !isValidNumber(data.experience, 0, 100)) errors.push('Experience must be between 0 and 100 years');
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            firstName: data.firstName ? sanitizeString(data.firstName) : undefined,
            lastName: data.lastName ? sanitizeString(data.lastName) : undefined,
            phone: data.phone,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            specialization: data.specialization ? sanitizeString(data.specialization) : undefined,
            experience: data.experience
        }
    };
}

function validateHealthMetric(data) {
    const errors = [];

    if (data.weight && !isValidNumber(data.weight, 0, 500)) errors.push('Weight must be between 0 and 500 kg');
    if (data.height && !isValidNumber(data.height, 0, 300)) errors.push('Height must be between 0 and 300 cm');
    if (data.bloodPressureSystolic && !isValidNumber(data.bloodPressureSystolic, 0, 300)) errors.push('Invalid systolic blood pressure');
    if (data.bloodPressureDiastolic && !isValidNumber(data.bloodPressureDiastolic, 0, 200)) errors.push('Invalid diastolic blood pressure');
    if (data.heartRate && !isValidNumber(data.heartRate, 0, 300)) errors.push('Heart rate must be between 0 and 300 bpm');
    if (data.temperature && !isValidNumber(data.temperature, 30, 45)) errors.push('Temperature must be between 30 and 45°C');

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: data
    };
}

function validateMedication(data) {
    const errors = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) errors.push('Medication name is required (min 2 characters)');
    if (!data.dosage || typeof data.dosage !== 'string') errors.push('Dosage is required');
    if (!data.frequency || typeof data.frequency !== 'string') errors.push('Frequency is required');

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            name: sanitizeString(data.name),
            dosage: sanitizeString(data.dosage),
            frequency: sanitizeString(data.frequency),
            notes: data.notes ? sanitizeString(data.notes) : ''
        }
    };
}

module.exports = {
    isValidSessionId,
    isValidUserId,
    isValidDoctorId,
    isValidEmail,
    isValidPassword,
    isValidPhone,
    isValidName,
    isValidUsername,
    isValidDate,
    isValidDateOfBirth,
    isValidTime,
    isValidReason,
    isValidSessionTitle,
    isValidMessage,
    isValidNumber,
    isValidFileUpload,
    sanitizeString,
    validateBookingParams,
    validateSearchParams,
    validateRegistration,
    validateProfileUpdate,
    validateHealthMetric,
    validateMedication
};
