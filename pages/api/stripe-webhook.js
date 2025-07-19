import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { type, data } = event;

  if (type === 'checkout.session.completed') {
    const session = data.object;
    const email = session.customer_email;

    const customerId = session.customer;
    const subscriptionId = session.subscription;

    const subscribedUntil = new Date();
    subscribedUntil.setDate(subscribedUntil.getDate() + 30);

    await supabase
      .from('profiles')
      .update({
        is_subscribed: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscribed_until: subscribedUntil.toISOString(),
      })
      .eq('email', email);
  }

  if (type === 'customer.subscription.deleted') {
    const subscriptionId = data.object.id;

    await supabase
      .from('profiles')
      .update({
        is_subscribed: false,
      })
      .eq('stripe_subscription_id', subscriptionId);
  }

  res.status(200).json({ received: true });
}
