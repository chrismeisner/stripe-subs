const express = require('express');
const axios = require('axios');
const stripe = require('stripe')('sk_live_4OQNGbzoGqbQzh77z7Kdo6DQ');
const path = require('path');
const app = express();

// Serve static files from the 'public' folder
app.use(express.static('public'));

// To parse incoming JSON
app.use(express.json());

// Serve index.html from the root directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));  // Serve the index.html from the root
});

// Serve subscribers
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
		phone: subscription.customer.phone || 'N/A', // Get the phone number here
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

// New route to send SMS using SlickText API
app.post('/send-sms', async (req, res) => {
  const { numbers, message } = req.body;
  const slickTextApiKey = 'your-public-api-key';  // Replace with your public API key
  const slickTextPrivateKey = 'your-private-api-key';  // Replace with your private API key
  const slickTextPhoneNumber = '833-567-3636'; // The sender's number or keyword

  // Combine public and private keys for Basic Auth
  const auth = Buffer.from(`${slickTextApiKey}:${slickTextPrivateKey}`).toString('base64');

  try {
	// Loop through numbers and send SMS
	for (let number of numbers) {
	  console.log(`Sending SMS to: ${number}`); // Log the number being sent to
	  console.log(`Message: ${message}`); // Log the message being sent

	  const response = await axios.post('https://api.slicktext.com/v1/messages', {
		phone_number: number,
		message: message,
		sender_id: slickTextPhoneNumber
	  }, {
		headers: {
		  Authorization: `Basic ${auth}`,  // Authorization header using Basic Auth
		  'Content-Type': 'application/json'
		}
	  });

	  // Log the response status and data
	  console.log(`Response Status: ${response.status}`);
	  console.log(`Response Data:`, response.data);

	  if (response.status !== 200) {
		console.error(`Failed to send SMS to ${number}:`, response.data);
		return res.status(500).json({ error: `Failed to send SMS to ${number}` });
	  }

	  // Log success
	  console.log(`SMS successfully sent to ${number}`);
	}

	// If all SMS were sent successfully
	console.log('All SMS messages sent successfully.');
	res.json({ success: true });
  } catch (error) {
	// Log error details
	console.error('Error sending SMS:', error.response ? error.response.data : error.message);
	res.status(500).json({ error: 'Error sending SMS' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
