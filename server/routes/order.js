var _ = require('underscore');
var models = require('../db.js');
const email = require('./email')

const formatShortDate = (date) => {
  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];
  const splitDate = date.split('-')
  const day = splitDate[2]
  const month = monthNames[parseInt(splitDate[1], 10) - 1]
  const year = splitDate[0]

  return `${month} ${day}, ${year}`
}

// GET /api/v1/orders
exports.list = function(req, res) {
    var query = req.query;
    var where = {};

    // QUERY PARAMETERS

    if (query.hasOwnProperty('order_date') && query.order_date.length > 0) {
        where.order_date =  query.order_date;
    }

    if (query.hasOwnProperty('customer_id') && query.customer_id.length > 0) {
        where.customer_id =  query.customer_id;
    }

    // order: [['order_date', 'DESC']] should order the date by latest first
    models.orders.findAll({
        where: where,
        order: [['id', 'DESC']],
        include: [{
            model: models.offers,
            include: [{
                model: models.meals,
                attributes: ['name', 'ingredients'],
                include: [{
                    model: models.restaurants,
                    attributes: ['name'],
                }],
            }]
        }, {
            model: models.feedbacks,
            model: models.pickup_times,
        }, {
          model: models.customers
        }]
    }).then(function(orders) {
        res.json(orders);
    }, function(e) {
        res.status(500).send();
    });
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
                attributes: ['name', 'description', 'ingredients'],
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
    var orderDetails = _.pick(req.body, 'order_date', 'pickup_time_id', 'offer_id', 'customer_id');
    models.orders.create(orderDetails)
      .then(order => {
        models.offers.findById(order.offer_id)
          .then(offer => {
            models.offers.update({ 'plates_left': offer.plates_left - 1 }, {
              where: { id: order.offer_id }
            })
              res.json(offer);
            })
          })
    }, function(e) {
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

        order.dataValues.hasOwnProperty('status') && order.dataValues.status !== 'cancelled' ?
          attributesToUpdate.status = 'cancelled' :
          null

        order.update(attributesToUpdate)
          .then(order => {
          // find the offer id from the order
          emailData.order_id = order.id
          emailData.order_date = formatShortDate(order.order_date)

            models.offers.findById(order.offer_id)
              .then(offer => {

                attributesToUpdate.status === 'cancelled' ?
                  attributesToUpdate.plates_left = offer.dataValues.plates_left + 1 :
                  null

                // updates the offers plates_left
                models.offers.update({"plates_left": attributesToUpdate.plates_left}, {
                  where: { id: order.offer_id }
                })
                .then(() => {
                  models.meals.findById(offer.meal_id)
                    .then(meal => {
                    emailData.meal_name = meal.name;

                    // find the customer id from the order
                    models.restaurants.findById(meal.restaurant_id)
                      .then(restaurant => {
                        emailData.restaurant_name = restaurant.name
                        emailData.restaurant_address = `${restaurant.address}, ${restaurant.city}, ${restaurant.state}`

                        models.customers.findById(order.dataValues.customer_id)
                          .then(customer => {
                            emailData.customer_name = customer.first_name
                            // checks to make sure there is a property called 'meals_remaining' and that it is greater than 0

                            attributesToUpdate.status === 'cancelled' ?
                              attributesToUpdate.meals_remaining = customer.dataValues.meals_remaining + 1 :
                              null

                            //updates the customer db with how many meals are remaining
                              models.customers.update({"meals_remaining": attributesToUpdate.meals_remaining}, {
                                where: { id: order.dataValues.customer_id }
                              })
                              .then(() => {
                                models.users.findById(customer.user_id)
                                  .then(user => {

                                    attributesToUpdate.status === 'cancelled' ?
                                    email.sendCOEmail({ email: user.dataValues.email, type: 'cancel-order', emailData: emailData }) :
                                    null

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