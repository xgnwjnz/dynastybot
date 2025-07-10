const Sequelize = require('sequelize');

// Configuración de Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    dialect: 'sqlite', 
    host: 'localhost',

    storage: 'database.sqlite',
    logging: false
});

module.exports = sequelize