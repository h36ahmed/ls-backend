var _ = require('underscore');
var postmark = require("postmark");
var EmailTemplate = require('email-templates').EmailTemplate;
var path = require('path');
var fs = require('fs');
var Handlebars = require('handlebars');
const icsFile = path.resolve(__dirname + '/icsData/', 'event.ics')


//Your api key
var api_key = '32b29fd6-338e-49a4-98be-25a4c21458d3';

//Your domain
var domain = 'www.lunchsociety.ca';

//Your sending email address
// var from_who = 'Lunch Society <daniel@lunchsociety.ca>';
var from_who = 'admin@lunchsociety.ca'

var client = new postmark.Client(api_key);

var templatesDir = path.resolve(__dirname, '..', 'email-templates');

var templates = {};

var response;

// load templates once
fs.readdirSync(templatesDir).forEach(function (file) {
    if (fs.statSync(path.join(templatesDir, file)).isDirectory()) {
        templates[file] = new EmailTemplate(path.join(templatesDir, file));
    }
});

const formatShortDate = (date) => {
  const monthNames = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  const splitDate = date.split('-')
  const day = splitDate[1]
  const month = monthNames[parseInt(splitDate[2], 10) - 1]
  const year = splitDate[0]

  return `${month} ${day}, ${year}`
}

function send(locals, cb) {
    const icsData = fs.readFileSync(icsFile, { encoding: 'base64' })
    let sendICS = []

    if (locals.ics) {
        sendICS = [{
            "Name": "meal.ics",
            "Content": icsData,
            "ContentType": "text/calendar"
        }]
    }

    client.sendEmailWithTemplate({
        "From": locals.from,
        "To": locals.data.email,
        "TemplateId": locals.templateID,
        "TemplateModel": locals.data,
        "Attachments": sendICS,
        "TrackOpens": true,
        "TrackLinks": "HtmlOnly"
    }, function (error, result) {
        if (error) {
            console.error("Unable to send via postmark: " + error.message);
            return;
        }
        console.info("Sent to postmark for delivery")
        cb();
    });

}

function complete(err) {
    if (err) {
        response.status(err.status).send();
        console.log("got an error: ", err.msg);
    } else {
        response.status(200).send();
    }
}

var sendWelcomeEmail = function (data, res) {

    var locals = {
        from: from_who,
        data: data,
        templateID: 2066904
    }

    response = res;

    send(locals, complete);
};

var sendOrderEmail = function (data, res) {
    console.log('data', data)
    // data.date = formatShortDate(data.date.split('T')[0])

    var locals = {
        from: from_who,
        data: data,
        templateID: 2067882,
        ics: true
    }

    response = res;

    send(locals, complete);
};

// Cancel Order Email
var sendCOEmail = function (data, res) {
    data.date = formatShortDate(data.date.split('T')[0])

    var locals = {
        from: from_who,
        data: data,
        templateID: 2068322
    }
    response = res;

    send(locals, complete);

};

var sendPasswordResetEmail = function (data, res) {

    var locals = {
        from: from_who,
        data: data,
        templateID: 2315281
    }

    response = res;

    send(locals, complete);
}


function formatDate(date) {
    var dd = date.getDate();
    var mm = date.getMonth() + 1; //January is 0!

    var yyyy = date.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    return yyyy + "-" + mm + "-" + dd;
}

// POST /api/v1/sendROEmail
exports.sendROEmail = function (req, res) {

    var roEmail = new EmailTemplate(path.join(templatesDir, 'restaurant-orders'));

    models.restaurants.findAll({
        attributes: ['id', 'name'],
        include: [{
            attributes: ['name', 'id'],
            model: models.meals,
            include: [{
                attributes: ['id'],
                model: models.offers,
                include: [{
                    model: models.orders,
                    where: where,
                    order: [
                        ['pickup_time']
                    ],
                    include: [{
                        model: models.customers,
                        attributes: ['first_name', 'last_name']
                    }, {
                        model: models.pickup_times,
                        attributes: ['pickup_time']
                    }]
                }]
            }]
        }, {
            attributes: ['first_name', 'last_name', 'phone_number'],
            model: models.owners,
            include: [{
                model: models.users,
                attributes: ['email']
            }]
        }]
    }).then(function (restaurants) {
        Promise.all(_.map(restaurants, function (restaurant) {
                return template.render(restaurant)
                    .then(function (results) {
                        const todayDate = formatDate(new Date());
                        return {
                            From: from_who,
                            To: restaurant.owner.user.email,
                            Subject: 'LUNCH SOCIETY: Orders for: ' + todayDate,
                            HtmlBody: results.html,
                            TextBody: results.text
                        }
                    })
            }))
            .then(function (messages) {
                client.sendEmailBatch(messages, function (err, batchResults) {
                    // Throwing inside a promise will just reject the promise
                    // not stop your server
                    if (err) throw err
                    console.info('Messages sent to postmark');
                });
            });
    }, function (e) {
        res.status(500).json(e);
    });
};

// POST /api/v1/sendEmail
exports.sendEmail = function (req, res) {
    var emailType = req.body.type;
    var email = req.body.email;

    switch (emailType) {
        case "welcome":
            sendWelcomeEmail({
                email: email
            }, res);
            break;
        case "order":
            sendOrderEmail({
                email: email
            }, res);
            break;
        case "cancel-order":
            sendCOEmail({
                email: email
            }, res);
            break;
        case "password-reset":
            sendPasswordResetEmail({
                email: email
            }, res);
            break;
        default:
            res.status(204).send();
    }
};

exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendOrderEmail = sendOrderEmail;
exports.sendCOEmail = sendCOEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
