const {stripePrivateKey, clientUrl, stripeWebhookSecret} = require("../config");
const stripe = require("stripe")(stripePrivateKey);
const {Users, Products} = require("../tempDb");

const createCheckoutSession = async (req, res) => {

    /* ---------- Get and validate data ---------- START */
    const {userId, products:usrProducts } = req.body;
    
    /* Validate the received data. Examples: 
        - Check if one or more products were sent
        - Check if a user id were sent
    */

    // Find the user in the db
    const [dbUser] = Users.filter(usr => usr.id === userId);

    // Check if the user exist

    let productsInfoAndQuantity = [];
    usrProducts.forEach(usrProduct => {
        
        // Find the product in the db
        const [dbProductInfo] = Products.filter(dbProduct => dbProduct.id === usrProduct.id);

        // Format the product info
        if(dbProductInfo) productsInfoAndQuantity.push({... dbProductInfo, quantity: usrProduct.quantity});
    });

    // Check if the received products are valid
    /* ---------- Get and validate data ---------- END */

    /* ---------- Manage Stripe customers ---------- START */
    
    // Validate customer id
    if (!!dbUser.stripeId) {
        try {
            const customer = await stripe.customers.retrieve(dbUser.stripeId);
            if (customer.email !== dbUser.email) await stripe.customers.update(dbUser.stripeId, {email: dbUser.email}); // Update customer email in stripe if necessary. Stripe will auto-fill this field in the checkout form and will disallow changing it
        } catch (error){
            if(error.message === `No such customer: '${dbUser.stripeId}'`) dbUser.stripeId = "";
            else console.log("Error: ", error.message);
        }
    }

    // Create a customer if there is not one already in stripe 
    if (!dbUser.stripeId) {
        const customer = await stripe.customers.create({email: dbUser.email});
        dbUser.stripeId = customer.id;
        
        // Save the new id in the db..
    }
    /* ---------- Manage Stripe customers ---------- END */

    /* ---------- Create checkout session ---------- START */

    // Format products
    const myLineItems = productsInfoAndQuantity.map(p => ({
        price_data: {
            currency: "eur",
            product_data: {
                name: p.name,
                images: p.images,
                description: p.briefDesc
            },
            unit_amount: p.cost
        },
        quantity: p.quantity,
    }));

    // Create session
    const session = await stripe.checkout.sessions.create({
        // submit_type: "donate",
        line_items: myLineItems,
        customer: dbUser.stripeId,
        payment_intent_data: {receipt_email: dbUser.email}, // Send email only if we have production keys
        mode: 'payment',
        success_url: `${clientUrl}/success.html`,
        cancel_url: `${clientUrl}/cancel.html`,
        expires_at: Math.floor(Date.now() / 1000) + (3600 * 1), // Configured to expire after 1 hour
        payment_intent_data: {  
            setup_future_usage: "on_session" // Attach the payment method to the customer and remember it for future payments
        }
    });
    /* ---------- Create checkout session ---------- END */

    // Manage newly created session data
    console.log("Create session ", session.id);
    // Save the checkout url in the db
    // res.redirect(303, session.url);
    res.json({ url: session.url});
};

const getCards = async (req, res) => {
    const {userId} = req.body;

    // Find the user in the db
    const [dbUser] = Users.filter(usr => usr.id === userId);

    // Check that the user exist and that the stripeId is valid
    
    // List customer cards
    const {data:rawCards} = await stripe.customers.listPaymentMethods(
        dbUser.stripeId,
        {type: 'card'}
    );

    // Format the cards
    const cards = rawCards.map(card => ({
        id: card.id,
        name: card.billing_details.name,
        brand: card.card.brand,
        last4: card.card.last4
    }));

    // Send the cards
    res.json(cards);
};

const deleteCard = async (req, res) => {
    const {cardId} = req.body;

    // Check the card id and its relation with the user

    // Detach a PaymentMethod from a Customer
    const paymentMethod = await stripe.paymentMethods.detach(cardId);

    res.json({ msg: "card " + cardId + " deleted"});
};

const manageResult = (req, res) => {
    const payload = req.body;
    
    // Verify events came from Stripe
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, stripeWebhookSecret);
    } catch (err) {
        console.log(err);
        return res.status(401).json({msg : "Unauthorized"});
    }

    const session = event.data.object;
    
    // Handle a successful payment event
    if ((event.type === 'checkout.session.completed' && session.payment_status === 'paid') || event.type === "checkout.session.async_payment_succeeded") console.log("Fulfilling order", session.id);
    
    // Handle async payment failed 
    else if (event.type === "checkout.session.async_payment_failed") console.log("Payment of the order ", session.id, " failed");
    
    // Handle an expired session
    else if (event.type === "checkout.session.expired") console.log("Return items of the order ", session.id, " to inventory");

    res.status(200).end(); // https://stackoverflow.com/questions/68430597/stripe-webhook-using-cli-fails-to-post-returns-client-timeout-exceeded-while-a
};

module.exports = {
    createCheckoutSession,
    getCards,
    deleteCard,
    manageResult
};