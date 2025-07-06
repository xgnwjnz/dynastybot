const { SlashCommandBuilder } = require('discord.js');
const moment = require('moment-timezone');

moment.tz.setDefault("America/Caracas"); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hora')
    .setDescription('Obtiene la hora actual en Venezuela'),

  async execute(interaction) {
    const now = moment();
    const horaVenezuela = now.format('HH:mm'); 

    await interaction.reply({ content: `La hora actual en Venezuela es: ${horaVenezuela}` });
  }
};