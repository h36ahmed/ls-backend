/*
Model Name: meals
SQL Table Name: meals
Description:
    Stores information about restaurant's meals.

Attributes:
-> Meal ID
-> Meal Name
-> Description
-> Tagline
-> Ingredients
-> Rating
-> Price
-> Meal Image
-> Available?
-> Restaurant ID

Methods:
-> toPublicJSON: This outputs only the fields that should be seen by public.

Use Cases:


*/

module.exports = function(sequelize, DataTypes) {
    var restaurants = sequelize.import(__dirname + "/restaurants.js");

    var meals = sequelize.define('meals', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: ["^[a-z]+$", 'i']
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isAlphanumeric: true
            }
        },
        tagline: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isAlphanumeric: true
            }
        },
        ingredients: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: ["^[a-z]+$", 'i']
            }
        },
        rating: {
            type: DataTypes.FLOAT,
            validate: {
                min: 0
            }
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: 0
            }
        },
        meal_image: {
            type: DataTypes.STRING
        },
        available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        restaurant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: restaurants,
                key: 'id'
            }
        }
    }, {
        timestamps: false
    });

    return meals;
};
