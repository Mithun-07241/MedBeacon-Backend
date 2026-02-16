const ServiceItem = require("../models/ServiceItem");
const { v4: uuidv4 } = require("uuid");

/**
 * Get all services (global + doctor's custom services)
 */
exports.getServices = async (req, res) => {
    try {
        const services = await ServiceItem.find({
            $or: [
                { isGlobal: true },
                { createdBy: req.user.id }
            ]
        }).sort({ isGlobal: -1, name: 1 });

        res.json({ services });
    } catch (error) {
        console.error("Get Services Error:", error);
        res.status(500).json({ error: "Failed to fetch services" });
    }
};

/**
 * Create a new custom service
 */
exports.createService = async (req, res) => {
    try {
        const { name, description, category, defaultPrice } = req.body;

        // Validate required fields
        if (!name || !category || defaultPrice === undefined) {
            return res.status(400).json({ error: "Name, category, and price are required" });
        }

        // Only doctors can create custom services
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ error: "Only doctors can create custom services" });
        }

        const service = await ServiceItem.create({
            id: uuidv4(),
            name,
            description: description || "",
            category,
            defaultPrice: parseFloat(defaultPrice),
            createdBy: req.user.id,
            isGlobal: false
        });

        res.status(201).json({
            message: "Service created successfully",
            service
        });
    } catch (error) {
        console.error("Create Service Error:", error);
        res.status(500).json({ error: "Failed to create service" });
    }
};

/**
 * Update a custom service
 */
exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, defaultPrice } = req.body;

        const service = await ServiceItem.findOne({ id });
        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }

        // Can't edit global services
        if (service.isGlobal) {
            return res.status(403).json({ error: "Cannot edit global services" });
        }

        // Can only edit own services
        if (service.createdBy !== req.user.id) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (name) service.name = name;
        if (description !== undefined) service.description = description;
        if (category) service.category = category;
        if (defaultPrice !== undefined) service.defaultPrice = parseFloat(defaultPrice);

        await service.save();

        res.json({
            message: "Service updated successfully",
            service
        });
    } catch (error) {
        console.error("Update Service Error:", error);
        res.status(500).json({ error: "Failed to update service" });
    }
};

/**
 * Delete a custom service
 */
exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await ServiceItem.findOne({ id });
        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }

        // Can't delete global services
        if (service.isGlobal) {
            return res.status(403).json({ error: "Cannot delete global services" });
        }

        // Can only delete own services
        if (service.createdBy !== req.user.id) {
            return res.status(403).json({ error: "Access denied" });
        }

        await ServiceItem.deleteOne({ id });

        res.json({ message: "Service deleted successfully" });
    } catch (error) {
        console.error("Delete Service Error:", error);
        res.status(500).json({ error: "Failed to delete service" });
    }
};
