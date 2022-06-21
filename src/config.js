require("dotenv").config();

module.exports = {
    port: process.env.PORT,
    clientUrl: process.env.CLIENT_URL,
    stripePrivateKey: process.env.STRIPE_PRIVATE_KEY,
    stripeWebhookSecret: process.env.WEBHOOK_SIGNING_SECRET
}
