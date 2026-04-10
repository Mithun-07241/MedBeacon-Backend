const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const ollamaService = require('./ollamaService');
const { loadDatabaseContext } = require('./dbContextLoader');
const { connectRegistry } = require('../config/registry');
const { getClinicConnection } = require('../config/clinicDb');
const { getModels } = require('../models/factory');

let aiChatController;

const initAutonomy = () => {
    // Defer loading to avoid circular dependency
    aiChatController = require('../controllers/aiChatController');
    
    console.log('🤖 Autonomous Agent Scheduler initialized.');

    // Run every morning at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running autonomous Morning Briefings for all clinics...');
        await runProactiveBriefings();
    });
};

const runProactiveBriefings = async () => {
    try {
        const registryConn = await connectRegistry();
        const ClinicRegistry = registryConn.model('ClinicRegistry');
        const activeClinics = await ClinicRegistry.find({ isActive: true });

        for (const clinic of activeClinics) {
            console.log(`📡 Autonomous Agent scanning clinic: ${clinic.clinicName}`);
            
            const tenantConn = await getClinicConnection(clinic.dbName);
            if (!tenantConn) continue;

            const models = getModels(tenantConn, clinic.dbName);
            const { User, AiChatSession } = models;
            
            const targetUsers = await User.find({ role: { $in: ['doctor', 'admin', 'clinic_admin'] } });

            for (const user of targetUsers) {
                try {
                    const internalPrompt = "Wake up agent! Execute my full morning briefing proactively.";
                    const dbContext = await loadDatabaseContext(models, user.role);

                    const session = await AiChatSession.create({ 
                        sessionId: uuidv4(),
                        userId: user.id, 
                        title: `☀️ Auto Briefing: ${new Date().toLocaleDateString()}`, 
                        messages: [{ role: 'user', content: internalPrompt, timestamp: new Date() }], 
                        bookingState: { doctor: null, date: null, time: null, reason: null } 
                    });

                    let history = [{ role: 'user', content: internalPrompt }];
                    let iterations = 0;
                    let aiResponse = await ollamaService.processMessage(history, user.role, dbContext, {});
                    const allToolsExecuted = [];

                    while (aiResponse.finishReason === 'tool_calls' && aiResponse.toolCalls?.length > 0 && iterations < 8) {
                        iterations++;
                        const toolCall = aiResponse.toolCalls[0];
                        const toolName = toolCall.function.name;
                        let parsedArgs = {};
                        try { parsedArgs = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments; } catch(e){}

                        let toolResult;
                        try {
                             toolResult = await aiChatController.executeToolCall(toolCall, user.id, user.role, models);
                        } catch(e) {
                            toolResult = { error: e.message };
                        }

                        allToolsExecuted.push(toolName);
                        const toolMsg = JSON.stringify(toolResult);
                        
                        history.push({ role: 'assistant', content: '', tool_calls: [toolCall] });
                        history.push({ 
                            role: 'user', 
                            content: `[SYSTEM: TOOL RESULTS - step ${iterations}]\n\n${toolMsg}\n\nPresent this proactive briefing beautifully and clearly.` 
                        });

                        aiResponse = await ollamaService.continueAfterToolExecution(history, user.role, dbContext, {});
                    }

                    session.messages.push({
                        role: 'assistant',
                        content: aiResponse.content || "Morning briefing initialized.",
                        timestamp: new Date(),
                        toolsExecuted: allToolsExecuted
                    });
                    await session.save();

                    console.log(`✅ Autonomous briefing delivered for ${user.email} -> Session: ${session.sessionId}`);
                } catch (userErr) {
                    console.error(`Failed autonomous run for user ${user.email}:`, userErr.message);
                }
            }
        }
    } catch (e) {
        console.error('Autonomous Cron Job failed:', e);
    }
};

module.exports = { initAutonomy, runProactiveBriefings };
