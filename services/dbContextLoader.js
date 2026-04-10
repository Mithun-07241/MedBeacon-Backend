/**
 * Load database context for AI
 * This gives the AI knowledge of available doctors, specializations,
 * inventory items, pharmacy stock, and platform stats
 * from the clinic-specific database via req.models.
 *
 * @param {object} models - The clinic-specific models object (from req.models)
 * @param {string} userRole - The role of the current user
 */
async function loadDatabaseContext(models, userRole = 'patient') {
    try {
        const { DoctorDetail, Appointment, User } = models;

        // Get all doctors with their basic info from the clinic DB
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

        const context = {
            doctors: doctorsWithRatings,
            specializations
        };

        // Load inventory & pharmacy context for doctor and admin roles
        if (userRole === 'doctor' || userRole === 'admin' || userRole === 'clinic_admin') {
            try {
                const { InventoryItem, PharmacyItem } = models;

                // Inventory summary
                if (InventoryItem) {
                    const invItems = await InventoryItem.find({}).limit(200).lean();
                    const invCategories = {};
                    let totalValue = 0;
                    let lowStockCount = 0;

                    invItems.forEach(item => {
                        invCategories[item.category] = (invCategories[item.category] || 0) + 1;
                        totalValue += (item.purchasePrice || 0) * (item.quantity || 0);
                        if (item.status === 'low_stock' || item.status === 'out_of_stock' || item.quantity <= 5) {
                            lowStockCount++;
                        }
                    });

                    context.inventory = {
                        totalItems: invItems.length,
                        totalValue: Math.round(totalValue),
                        lowStockCount,
                        categories: invCategories,
                        sampleItems: invItems.slice(0, 10).map(i => ({
                            name: i.name, category: i.category, quantity: i.quantity,
                            unit: i.unit, price: i.purchasePrice, status: i.status
                        }))
                    };
                }

                // Pharmacy summary
                if (PharmacyItem) {
                    const pharmItems = await PharmacyItem.find({}).limit(200).lean();
                    const now = new Date();
                    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                    const lowStockPharm = pharmItems.filter(i => i.quantity <= i.reorderLevel);
                    const expiringPharm = pharmItems.filter(i => i.expiryDate && new Date(i.expiryDate) <= thirtyDays && new Date(i.expiryDate) > now);
                    const expiredPharm = pharmItems.filter(i => i.expiryDate && new Date(i.expiryDate) <= now);

                    context.pharmacy = {
                        totalItems: pharmItems.length,
                        lowStockCount: lowStockPharm.length,
                        expiringCount: expiringPharm.length,
                        expiredCount: expiredPharm.length,
                        sampleItems: pharmItems.slice(0, 8).map(i => ({
                            name: i.name, category: i.category, quantity: i.quantity,
                            unit: i.unit, price: i.price, status: i.status,
                            expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString().split('T')[0] : 'N/A'
                        }))
                    };
                }
            } catch (invError) {
                console.warn('Could not load inventory/pharmacy context:', invError.message);
            }
        }

        // Load platform stats for admin
        if (userRole === 'admin' || userRole === 'clinic_admin') {
            try {
                const totalUsers = await User.countDocuments();
                const totalDoctors = await User.countDocuments({ role: 'doctor' });
                const totalPatients = await User.countDocuments({ role: 'patient' });
                const totalAppointments = await Appointment.countDocuments();
                const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
                const pendingDoctors = await User.countDocuments({ role: 'doctor', verificationStatus: 'under_review' });
                const todayStr = new Date().toISOString().split('T')[0];
                const todayAppointments = await Appointment.countDocuments({ date: todayStr });

                context.platformStats = {
                    totalUsers, totalDoctors, totalPatients,
                    totalAppointments, pendingAppointments,
                    pendingDoctors, todayAppointments
                };
            } catch (statsError) {
                console.warn('Could not load platform stats:', statsError.message);
            }
        }

        return context;
    } catch (error) {
        console.error('Error loading database context:', error);
        return { doctors: [], specializations: [] };
    }
}

module.exports = {
    loadDatabaseContext
};
