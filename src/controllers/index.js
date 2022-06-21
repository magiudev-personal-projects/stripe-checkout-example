const {stripePrivateKey, clientUrl} = require("../config");
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
        success_url: `${clientUrl}/front/success.html`,
        cancel_url: `${clientUrl}/front/cancel.html`,
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

module.exports = {
    createCheckoutSession,
}