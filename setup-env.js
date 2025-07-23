const fs = require('fs');
const path = require('path');

// Environment template
const envTemplate = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/skinny-ai
PORT=5000

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password-here

# Node Environment
NODE_ENV=development
`;

const envPath = path.join(__dirname, '.env');

// Check if .env file already exists
if (fs.existsSync(envPath)) {
    console.log('❌ .env file already exists!');
    console.log('Please update the following variables in your .env file:');
    console.log('- STRIPE_SECRET_KEY: Your Stripe secret key');
    console.log('- STRIPE_WEBHOOK_SECRET: Your Stripe webhook secret');
    console.log('- OPENAI_API_KEY: Your OpenAI API key');
    console.log('- JWT_SECRET: A secure random string for JWT signing');
    console.log('- MONGODB_URI: Your MongoDB connection string');
    process.exit(1);
}

// Create .env file
try {
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ .env file created successfully!');
    console.log('');
    console.log('📝 Please update the following variables in your .env file:');
    console.log('');
    console.log('1. STRIPE_SECRET_KEY - Get from https://dashboard.stripe.com/apikeys');
    console.log('2. STRIPE_WEBHOOK_SECRET - Get from https://dashboard.stripe.com/webhooks');
    console.log('3. OPENAI_API_KEY - Get from https://platform.openai.com/api-keys');
    console.log('4. JWT_SECRET - Generate a secure random string');
    console.log('5. MONGODB_URI - Your MongoDB connection string');
    console.log('6. EMAIL_USER & EMAIL_PASS - For sending emails');
    console.log('');
    console.log('💡 After updating the .env file, restart your server with: npm run dev');
    console.log('');
    console.log('🚀 Your server should now start without errors!');
} catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    process.exit(1);
} 