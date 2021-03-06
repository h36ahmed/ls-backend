var _ = require('underscore');
var models = require('../db.js');
const email = require('./email')
const payment = require('./payment.js')
const ics = require('../ics-generator.js')

// GET /api/v1/orders
exports.list = function(req, res) {
    var query = req.query;
    var where = {};

    // QUERY PARAMETERS

    if (query.hasOwnProperty('order_date') && query.order_date.length > 0) {
        where.order_date = query.order_date;
    }

    if (query.hasOwnProperty('customer_id') && query.customer_id.length > 0) {
        where.customer_id = query.customer_id;
    }

    if (query.hasOwnProperty('status') && query.status.length > 0) {
        where.status = query.status
    }

    if (query.hasOwnProperty('groupedByPickups') && query.groupedByPickups) {
        models.pickup_times.findAll({
            include: [{
                model: models.orders,
                where: {
                    order_date: query.order_date
                },
                include: [{
                    model: models.offers,
                    include: [{
                        model: models.meals,
                        attributes: ['name', 'ingredients'],
                        include: [{
                            model: models.restaurants,
                            attributes: ['name'],
                            where: query.restaurant ? {
                                id: query.restaurant
                            } : {}
                        }],
                    }]
                }, {
                    model: models.customers
                }]
            }]
        }).then(function(orders) {
            res.json(orders);
        }, function(e) {
            res.status(500).send();
        });
    } else {
        models.orders.findAll({
            where: where,
            order: [
                ['id', 'DESC']
            ],
            include: [{
                model: models.offers,
                where: query.offer_date ? {
                    offer_date: query.offer_date
                } : {},
                include: [{
                    model: models.meals,
                    attributes: ['name', 'ingredients'],
                    include: [{
                        model: models.restaurants,
                        attributes: ['name'],
                        where: query.restaurant ? {
                            id: query.restaurant
                        } : {}
                    }],
                }]
            }, {
                model: models.pickup_times,
            }, {
                model: models.customers
            }, {
                model: models.feedbacks
            }]
        }).then(function(orders) {
            res.json(orders);
        }, function(e) {
            res.status(500).send();
        });
    }
};

// GET /api/v1/orders/:id
exports.view = function(req, res) {
    const orderId = parseInt(req.params.id, 10)

    models.orders.findById(orderId, {
            include: [{
                model: models.pickup_times,
                attributes: ['pickup_time']
            }, {
                model: models.offers,
                include: [{
                    model: models.meals,
                    attributes: ['name', 'description', 'ingredients', 'meal_image'],
                    include: [{
                        model: models.restaurants,
                        attributes: ['name', 'street_address', 'city', 'state', 'country', 'postal_code', 'longitude', 'latitude'],
                    }]
                }]
            }, {
                model: models.customers,
                include: [{
                    model: models.users,
                    attributes: ['email'],
                }]
            }]
        })
        .then(function(order) {
            res.json(order);
        }, function(e) {
            res.status(400).json(e);
        })
}

// POST /api/v1/order
exports.create = function(req, res) {
        var orderDetails = _.pick(req.body, 'order_date', 'pickup_time_id', 'offer_id', 'customer_id', 'status');
        const emailData = {}
        models.orders.create(orderDetails)
            .then(order => {
                emailData.date = order.order_date

                models.offers.findById(order.offer_id, {
                        include: [{
                            model: models.meals,
                            attributes: ['name'],
                            include: [{
                                model: models.restaurants,
                                attributes: ['name', 'street_address', 'city', 'state', 'country', 'postal_code', 'longitude', 'latitude']
                            }]
                        }]
                    })
                    .then(offer => {
                        const {
                            name,
                            street_address,
                            city,
                            postal_code,
                            longitude,
                            latitude
                        } = offer.meal.restaurant
                        emailData.meal = {
                            name: offer.meal.name
                        }
                        emailData.restaurant = {
                            name,
                            street_address,
                            city,
                            postal_code,
                            longitude,
                            latitude
                        }

                        models.offers.update({
                                'plates_left': offer.plates_left - 1
                            }, {
                                where: {
                                    id: order.offer_id
                                }
                            })
                            .then(() => {
                                models.customers.findById(order.customer_id, {
                                        include: [{
                                            model: models.users,
                                            attributes: ['email']
                                        }]
                                    })
                                    .then(customer => {
                                        emailData.name = customer.first_name
                                        emailData.last_name = customer.last_name
                                        emailData.email = customer.user.email

                                        models.customers.update({
                                                'meals_remaining': customer.meals_remaining - 1
                                            }, {
                                                where: {
                                                    id: customer.id
                                                }
                                            })
                                            .then(() => {
                                                // if (customer.meals_remaining - 1 === 0 && customer.payment_plan_id === 3) {
                                                //   payment.updateSubscription(customer.id, res)
                                                // }
                                                models.pickup_times.findById(order.pickup_time_id)
                                                    .then(pickup_time => {
                                                        emailData.pick_up_time = pickup_time.pickup_time
                                                        emailData.link = ics.generateICS(emailData)
                                                        email.sendOrderEmail(emailData, res)
                                                        res.json(order)
                                                    })
                                            })
                                    })
                            })
                    })
            })
    },
    function(e) {
        res.status(400).json(e);
    };
// DELETE /api/v1/order/:id
exports.delete = function(req, res) {
    var orderID = parseInt(req.params.id, 10);
    models.orders.destroy({
        where: {
            id: orderID
        }
    }).then(function(rowsDeleted) {
        if (rowsDeleted === 0) {
            res.status(404).json({
                error: 'No order found'
            });
        } else {
            res.status(204).send();
        }
    }, function() {
        res.status(500).send();
    });
};

// UPDATE /api/v1/order/:id
exports.update = (req, res) => {
    const orderId = parseInt(req.params.id, 10)
    const attributesToUpdate = {}
    const emailData = {}

    models.orders.findById(orderId)
        .then(order => {
            if (order) {
                if (order.dataValues.hasOwnProperty('status') && order.dataValues.status !== 'cancelled') {
                    attributesToUpdate.status = 'cancelled'
                }

                order.update(attributesToUpdate)
                    .then(order => {
                        const orderDetails = order.toJSON()
                        emailData.date = order.order_date

                        models.offers.findById(orderDetails.offer_id)
                            .then(offer => {
                                const offerDetails = offer.toJSON()
                                attributesToUpdate.plates_left = offerDetails.plates_left - 1

                                if (attributesToUpdate.status === 'cancelled') {
                                    attributesToUpdate.plates_left = offerDetails.plates_left + 1
                                }

                                models.offers.update({
                                        plates_left: attributesToUpdate.plates_left
                                    }, {
                                        where: {
                                            id: orderDetails.offer_id
                                        }
                                    })
                                    .then(() => {
                                        models.meals.findById(offerDetails.meal_id)
                                            .then(meal => {
                                                const mealDetails = meal.toJSON()
                                                emailData.meal = {
                                                    name: mealDetails.name
                                                }

                                                models.restaurants.findById(mealDetails.restaurant_id)
                                                    .then(restaurant => {
                                                        const restaurantDetails = restaurant.toJSON()
                                                        emailData.restaurant = {
                                                            name: restaurantDetails.name,
                                                            street_address: restaurantDetails.street_address,
                                                            city: restaurantDetails.city
                                                        }

                                                        models.customers.findById(orderDetails.customer_id)
                                                            .then(customer => {
                                                                const customerDetails = customer.toJSON()
                                                                emailData.name = customerDetails.first_name

                                                                attributesToUpdate.meals_remaining = customerDetails.meals_remaining - 1

                                                                if (attributesToUpdate.status === 'cancelled') {
                                                                    attributesToUpdate.meals_remaining = customerDetails.meals_remaining + 1
                                                                }

                                                                models.customers.update({
                                                                        meals_remaining: attributesToUpdate.meals_remaining
                                                                    }, {
                                                                        where: {
                                                                            id: orderDetails.customer_id
                                                                        }
                                                                    })

                                                                    .then(() => {
                                                                        models.users.findById(customerDetails.user_id)
                                                                            .then(user => {
                                                                                const userDetails = user.toJSON()
                                                                                emailData.email = userDetails.email

                                                                                models.pickup_times.findById(orderDetails.pickup_time_id)
                                                                                    .then(pickup_time => {
                                                                                        const pickupTimeDetails = pickup_time.toJSON()
                                                                                        emailData.pick_up_time = pickupTimeDetails.pickup_time
                                                                                        if (attributesToUpdate.status === 'cancelled') {
                                                                                            email.sendCOEmail(emailData, res)
                                                                                        }
                                                                                        res.json(order)
                                                                                    })
                                                                            }, e => {
                                                                                res.status(400).json(e)
                                                                            })
                                                                    })
                                                            })
                                                    })
                                            })
                                    })
                            })
                    })
            } else {
                res.status(404).send()
            }
        }, () => {
            res.status(500).send()
        })
}
