const mongoose = require('mongoose');
const { Plan } = require('./src/models/Plan');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skinny', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const plans = [
    {
        name: 'Free',
        description: 'Basic skin analysis features',
        price: 0,
        // Replace with your actual Stripe IDs from dashboard
        stripeProductId: 'prod_SgLAav9GYP9en5',
        stripePriceId: 'price_1RkyUQCxVFrujywQZIWBXvsu',
        features: [
            { name: 'Basic skin analysis', included: true },
            { name: '5 analyses per month', included: true },
            { name: 'Basic recommendations', included: true }
        ],
        analysisLimit: 5,
        trialPeriodDays: 0,
        isActive: true,
        sortOrder: 1
    },
    {
        name: 'Premium',
        description: 'Advanced analysis with detailed insights',
        price: 999, // $9.99 in cents
        // Replace with your actual Stripe IDs from dashboard
        stripeProductId: 'prod_SgKtyLMMMNeIaE',
        stripePriceId: 'price_1RkyDKCxVFrujywQSvrulSAi',
        features: [
            { name: 'Advanced skin analysis', included: true },
            { name: 'Unlimited analyses', included: true },
            { name: 'Detailed recommendations', included: true },
            { name: 'Progress tracking', included: true }
        ],
        analysisLimit: -1, // Unlimited
        trialPeriodDays: 0,
        isActive: true,
        sortOrder: 2
    },
    {
        name: 'Pro',
        description: 'Professional-grade analysis and features',
        price: 7500, // $75.00 in cents
        // Replace with your actual Stripe IDs from dashboard
        stripeProductId: 'prod_SgLA8LWPcTzE8I',
        stripePriceId: 'price_1RkyTjCxVFrujywQ9wOOiYz7',
        features: [
            { name: 'Professional analysis', included: true },
            { name: 'Unlimited analyses', included: true },
            { name: 'AI-powered recommendations', included: true },
            { name: 'Progress tracking', included: true },
            { name: 'Priority support', included: true },
            { name: 'Advanced reporting', included: true }
        ],
        analysisLimit: -1, // Unlimited
        trialPeriodDays: 0,
        isActive: true,
        sortOrder: 3
    }
];

async function createPlans() {
    try {
        // Clear existing plans
        await Plan.deleteMany({});
        
        // Create new plans
        for (const planData of plans) {
            const plan = new Plan(planData);
            await plan.save();
            console.log(`Created plan: ${plan.name}`);
        }
        
        console.log('All plans created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating plans:', error);
        process.exit(1);
    }
}

createPlans(); 