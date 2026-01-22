const DoctorDetail = require('../models/DoctorDetail');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

/**
 * Load database context for AI
 * This gives the AI knowledge of available doctors and specializations
 */
async function loadDatabaseContext() {
    try {
        // Get all doctors with their basic info
        const doctors = await DoctorDetail.find()
            .limit(50) // Limit to prevent token overflow
            .select('userId firstName lastName specialization hospital availability');

        // Get unique specializations
        const specializations = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

        // Get ratings for each doctor (simplified - just get top rated)
        const doctorsWithRatings = await Promise.all(
            doctors.slice(0, 20).map(async (doc) => { // Limit to top 20 to save tokens
                const stats = await Appointment.aggregate([
                    { $match: { doctorId: doc.userId, status: 'completed' } },
                    {
                        $group: {
                            _id: null,
                            totalRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, 1, 0] } },
                            sumRatings: { $sum: { $cond: [{ $eq: ['$rated', true] }, '$rating', 0] } }
                        }
                    }
                ]);

                const doctorStats = stats[0] || { totalRatings: 0, sumRatings: 0 };
                const averageRating = doctorStats.totalRatings > 0
                    ? (doctorStats.sumRatings / doctorStats.totalRatings).toFixed(1)
                    : 'New';

                // Get user info for username fallback
                const user = await User.findOne({ id: doc.userId });

                return {
                    id: doc.userId,
                    name: doc.firstName && doc.lastName
                        ? `Dr. ${doc.firstName} ${doc.lastName}`
                        : user?.username || 'Doctor',
                    specialization: doc.specialization || 'General Practitioner',
                    hospital: doc.hospital || 'N/A',
                    rating: averageRating,
                    availability: doc.availability || 'available'
                };
            })
        );

        return {
            doctors: doctorsWithRatings,
            specializations
        };
    } catch (error) {
        console.error('Error loading database context:', error);
        return { doctors: [], specializations: [] };
    }
}

module.exports = {
    loadDatabaseContext
};
