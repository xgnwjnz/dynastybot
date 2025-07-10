// models/Equipo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Equipo = sequelize.define('Equipo', {
  equipoId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false,
    allowNull: false,
    unique: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  abreviacion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dt: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fichajes_emergencia: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false
  }
});

module.exports = Equipo;