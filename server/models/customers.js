/*
Model Name: customers
SQL Table Name: customers
Description:
    Stores information about the customers.

Attributes:
-> Customer ID
-> First Name
-> Last Name
-> Age
-> Gender
-> Cycle Start Date
-> Cycle End Date
-> Date Joined
-> Meals Remaining
-> Phone Number
-> City
-> Country
-> Profile Image
-> Active?
-> Reminder Emails?
-> Payment Plan ID
-> User ID
-> Stripe Token
-> Referral Code Used

Methods:
-> toPublicJSON: This outputs only the fields that should be seen by public.

Use Cases:


*/

module.exports = function(sequelize, DataTypes) {
    var paymentPlan = sequelize.import(__dirname + "/paymentPlans.js");
    var users = sequelize.import(__dirname + "/users.js");
    var referralCodes = sequelize.import(__dirname + "/referralcodes.js");

    var customers = sequelize.define('customers', {
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: ["^[a-z]+$", 'i']
            }
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: ["^[a-z]+$", 'i']
            }
        },
        age: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 16,
                max: 90
            }
        },
        gender: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['male', 'female', 'other']]
            }
        },
        cycle_start_date: {
            type: DataTypes.DATE
        },
        cycle_end_date: {
            type: DataTypes.DATE
        },
        date_joined: {
            type: DataTypes.DATE
        },
        meals_remaining: {
            type: DataTypes.INTEGER,
            validate: {
                min: 0,
                max: 500
            }
        },
        phone_number: {
            type: DataTypes.INTEGER,
            validate: {
                len: [9]
            }
        },
        city: {
            type: DataTypes.STRING,
            validate: {
                is: ["^[a-z]+$", 'i']
            }
        },
        country: {
            type: DataTypes.STRING,
            validate: {
                is: ["^[a-z]+$", 'i']
            }
        },
        profile_image: {
            type: DataTypes.STRING
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        reminder_emails: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        payment_plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: paymentPlan,
                key: 'id'
            }
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: users,
                key: 'id'
            }
        },
        referral_code_used: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: referralCodes,
                key: 'referralCode'
            }
        },
        stripe_token: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        timestamps: false,
        instanceMethods: {
            toPublicJSON: function() {
                var json = this.toJSON();
                return _.pick(json, 'id', 'first_name', 'last_name', 'age', 'gender', 'cycle_start_date', 'cycle_end_date', 'user_id', 'payment_plan_id', 'reminder_emails', 'active', 'country', 'city', 'meals_remaining', 'profile_image', 'phone_number', 'date_joined');
            }
        }
    });

    return customers;
};
