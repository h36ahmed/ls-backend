/*
Model Name: offers
SQL Table Name: offers
Description:
    Stores information about offers that are available to the customer for a particular date.

Attributes:
-> Offer ID
-> Offer Date
-> Plates Left
-> Plates Assigned
-> Meal ID
-> Status

Use Cases:


*/

module.exports = function(sequelize, DataTypes) {
    var offers = sequelize.define('offers', {
        offer_date: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        plates_assigned: {
            type: DataTypes.INTEGER,
            validate: {
                min: 0
            }
        },
        plates_left: {
            type: DataTypes.INTEGER,
            validate: {
                min: 0
            }
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'active'
        }
    }, {
        underscored: true,
        timestamps: false
    });

    return offers;
};
