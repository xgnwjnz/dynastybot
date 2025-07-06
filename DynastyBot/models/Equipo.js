const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Equipo = sequelize.define('Equipo', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  abreviacion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fichajes_emergencia: {
    type: DataTypes.INTEGER,
    defaultValue: 3, 
    allowNull: false,
  },
});

module.exports = Equipo;