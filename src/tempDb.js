const Users = [
    { 
        id: "1",
        stripeId: "cus_LukBJdZJCvAxlu", // Please replace this hardcoded id
        email: "user1@gmail.com",
    },
    { 
        id: "2",
        stripeId: "",
        email: "user2@gmail.com",
    },
];

const Products = [
    {
        id: "1",
        name: "Plumbus",
        briefDesc: "An all-purpose home device",
        images: [
            "https://cdn.myminifactory.com/assets/object-assets/5c3f2b132af70/images/720X720-shapeways-0004-img-7494.jpg",
            "https://cdn.domestika.org/c_fill,dpr_1.0,f_auto,h_1200,pg_1,t_base_params,w_1200/v1595867851/project-covers/000/814/838/814838-original.jpg?1595867851"
        ],
        cost: 300
    },
    {
        id: "2",
        name: "Electric Hammer",
        briefDesc: "An all-purpose electric hammer by Homer",
        images: [ "https://m.media-amazon.com/images/M/MV5BZDI3YTU4Y2UtMDg0ZC00YWNjLTk3MDItNzg1YzNlNTczMGE2XkEyXkFqcGdeQXVyNjcwMzEzMTU@._V1_QL75_UY281_CR155,0,190,281_.jpg" ],
        cost: 200
    }
];

module.exports ={
    Users,
    Products
}