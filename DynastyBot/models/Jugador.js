const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Jugador = sequelize.define('Jugador', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  equipo: {
    type: DataTypes.STRING,
    defaultValue: 'Agente Libre',
  },
  discordId: {
    type: DataTypes.STRING, // Guardar el ID de Discord
    allowNull: false,
    unique: true, // Asegura que el ID de Discord sea único
  },
});

module.exports = Jugador;