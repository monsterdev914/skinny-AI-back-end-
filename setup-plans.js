require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skinny', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define Plan schema directly
const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    stripeProductId: {
        type: String,
        trim: true
    },
    stripePriceId: {
        type: String,
        trim: true
    },
    features: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        included: {
            type: Boolean,
            required: true,
            default: false
        },
        limit: {
            type: Number,
            default: null
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    trialPeriodDays: {
        type: Number,
        default: 0,
        min: 0
    },
    analysisLimit: {
        type: Number,
        default: 0
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Plan = mongoose.model('Plan', planSchema);

const plans = [
    {
        name: 'Free',
        description: 'Basic skin analysis features',
        price: 0,
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
        console.log('Connected to MongoDB');
        
        // Clear existing plans
        await Plan.deleteMany({});
        console.log('Cleared existing plans');
        
        // Create new plans
        for (const planData of plans) {
            const plan = new Plan(planData);
            await plan.save();
            console.log(`Created plan: ${plan.name} - $${(plan.price / 100).toFixed(2)}`);
        }
        
        console.log('✅ All plans created successfully!');
        
        // List all plans
        const allPlans = await Plan.find({}).sort({ sortOrder: 1 });
        console.log('\nCreated plans:');
        allPlans.forEach(plan => {
            console.log(`- ${plan.name}: $${(plan.price / 100).toFixed(2)} (${plan.features.length} features)`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating plans:', error);
        process.exit(1);
    }
}

createPlans(); 