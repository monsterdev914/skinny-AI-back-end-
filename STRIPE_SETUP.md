# Stripe Integration Setup

## Required Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Stripe Setup Steps

### 1. Create Stripe Account
- Go to [Stripe Dashboard](https://dashboard.stripe.com)
- Create an account or sign in
- Get your API keys from the Dashboard

### 2. Set Up Products and Prices
Create three products in your Stripe dashboard:

#### Free Plan
- Product ID: Save this as `stripeProductId` in your Plan model
- Price: $0 (no prices needed)

#### Premium Plan
- Product ID: Save this as `stripeProductId` in your Plan model
- Monthly Price: $9.99 → Save price ID as `stripeMonthlyPriceId`
- Yearly Price: $119.88 → Save price ID as `stripeYearlyPriceId`

#### Pro Plan
- Product ID: Save this as `stripeProductId` in your Plan model
- Monthly Price: $75.00 → Save price ID as `stripeMonthlyPriceId`
- Yearly Price: $750.00 → Save price ID as `stripeYearlyPriceId`

### 3. Set Up Webhooks
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy the webhook secret and add it to your `.env` file

### 4. Database Plan Setup
After setting up Stripe products, update your database plans:

```javascript
// Example: Update plans with Stripe IDs
db.plans.updateOne(
  { name: "Free" },
  { 
    $set: { 
      stripeProductId: "prod_xxx" 
    } 
  }
);

db.plans.updateOne(
  { name: "Premium" },
  { 
    $set: { 
      stripeProductId: "prod_yyy",
      stripeMonthlyPriceId: "price_monthly_yyy",
      stripeYearlyPriceId: "price_yearly_yyy"
    } 
  }
);

db.plans.updateOne(
  { name: "Pro" },
  { 
    $set: { 
      stripeProductId: "prod_zzz",
      stripeMonthlyPriceId: "price_monthly_zzz",
      stripeYearlyPriceId: "price_yearly_zzz"
    } 
  }
);
```

## API Endpoints

### Subscription Management
- `GET /api/subscriptions/current` - Get current subscription
- `GET /api/subscriptions/history` - Get subscription history
- `GET /api/subscriptions/logs` - Get subscription logs
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription (upgrade/downgrade)
- `GET /api/subscriptions/:id/preview` - Get subscription change preview
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/reactivate` - Reactivate subscription

### Payment Methods
- `GET /api/payment-methods` - Get user payment methods
- `POST /api/payment-methods/setup-intent` - Create setup intent
- `POST /api/payment-methods/confirm-setup-intent` - Confirm setup intent
- `POST /api/payment-methods/:id/set-default` - Set default payment method
- `DELETE /api/payment-methods/:id` - Delete payment method

### Webhooks
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## Features Implemented

✅ **Subscription Management**
- Create subscriptions (trial to paid)
- Upgrade/downgrade subscriptions
- Cancel subscriptions (immediate or at period end)
- Reactivate cancelled subscriptions
- Subscription preview for plan changes

✅ **Payment Methods**
- Add payment methods securely
- Set default payment method
- Delete payment methods
- Setup intents for secure card collection

✅ **Subscription Logging**
- Track all subscription changes
- Detailed logs for auditing
- User subscription history

✅ **Webhook Handling**
- Real-time subscription updates
- Payment success/failure handling
- Trial expiration notifications

✅ **Security**
- No direct Stripe API calls from frontend
- Webhook signature verification
- User ownership verification

## Usage Flow

1. **Free to Paid**: User creates subscription with trial or direct payment
2. **Upgrade/Downgrade**: User changes plan, immediate billing with proration
3. **Cancel**: User cancels subscription, can choose immediate or end-of-period
4. **Reactivate**: User can reactivate cancelled subscription before period ends

All changes are logged in the `SubscriptionLog` collection for audit purposes. 