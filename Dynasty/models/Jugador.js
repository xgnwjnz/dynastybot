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
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  estadisticas: {
    type: DataTypes.JSON,
    defaultValue: {},
  }
}, {
  freezeTableName: true
});

Jugador.updateStats = async function(playerId, competition, statsToAdd) {
  const player = await this.findByPk(playerId);
  if (!player) return null;

  const currentStats = JSON.parse(JSON.stringify(player.estadisticas || {}));

  if (!currentStats[competition]) {
    currentStats[competition] = { goles: 0, asistencias: 0, vallas: 0, autogoles: 0 };
    console.log(`[Jugador.updateStats] Inicializando competencia "${competition}" para jugador ${player.nombre}.`);
  }


  if (!currentStats.totales) {
    currentStats.totales = { goles: 0, asistencias: 0, vallas: 0, autogoles: 0 };
    console.log(`[Jugador.updateStats] Inicializando totales para jugador ${player.nombre}.`);
  }


  currentStats[competition].goles += statsToAdd.goles || 0;
  currentStats[competition].asistencias += statsToAdd.asistencias || 0;
  currentStats[competition].vallas += statsToAdd.vallas || 0;
  currentStats[competition].autogoles += statsToAdd.autogoles || 0;

  currentStats.totales.goles += statsToAdd.goles || 0;
  currentStats.totales.asistencias += statsToAdd.asistencias || 0;
  currentStats.totales.vallas += statsToAdd.vallas || 0;
  currentStats.totales.autogoles += statsToAdd.autogoles || 0;

  player.estadisticas = currentStats;
  await player.save();
  return player;
};

module.exports = Jugador;