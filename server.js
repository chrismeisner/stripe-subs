const express = require('express');
const stripe = require('stripe')('sk_live_4OQNGbzoGqbQzh77z7Kdo6DQ');
const app = express();

// Serve the static HTML file
app.use(express.static('public'));

app.get('/get-subscribers', async (req, res) => {
  try {
	let allSubscribers = [];
	let hasMore = true;
	let lastSubscriptionId = null;

	while (hasMore) {
	  const params = {
		status: 'active',
		limit: 100,
		expand: ['data.customer', 'data.discount', 'data.plan.product'],
	  };

	  if (lastSubscriptionId) {
		params.starting_after = lastSubscriptionId;
	  }

	  const subscriptions = await stripe.subscriptions.list(params);

	  const subscribers = subscriptions.data.map(subscription => ({
		id: subscription.customer.id,
		email: subscription.customer.email || 'N/A',
		name: subscription.customer.name || 'N/A',
		phone: subscription.customer.phone || 'N/A',  // Get the phone number here
		subscription_status: subscription.status,
		plan_name: subscription.plan.nickname || 'N/A',
		product_name: subscription.plan.product.name || 'N/A',
		amount_charged: (subscription.plan.amount / 100).toFixed(2),
		currency: subscription.plan.currency.toUpperCase(),
		current_period_end: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
		trial_end: subscription.trial_end
		  ? new Date(subscription.trial_end * 1000).toLocaleDateString()
		  : 'N/A',
		subscription_start: new Date(subscription.start_date * 1000).toLocaleDateString(),
		billing_interval: subscription.plan.interval,
		discount: subscription.discount
		  ? `${subscription.discount.coupon.percent_off}% off`
		  : 'None',
	  }));

	  allSubscribers = allSubscribers.concat(subscribers);

	  hasMore = subscriptions.has_more;
	  if (hasMore) {
		lastSubscriptionId = subscriptions.data[subscriptions.data.length - 1].id;
	  }
	}

	res.json({ subscribers: allSubscribers });
  } catch (error) {
	console.error('Error fetching subscribers:', error);
	res.status(500).json({ error: 'Unable to fetch subscribers' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
