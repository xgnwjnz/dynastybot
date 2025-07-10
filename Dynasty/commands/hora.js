const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');

moment.tz.setDefault('America/Caracas');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('hora')
    .setDescription('🕒 Muestra la hora en Venezuela'),

  //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
  //                EJECUCIÓN DEL COMANDO          //
  //━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━//
  async execute(interaction) {
    const ahora = moment();

    const hora = ahora.format('HH:mm');

    const embed = new EmbedBuilder()
      .setTitle('🕒 Hora actual en Venezuela')
      .setDescription([
        `> **${hora}** 🕔 *(Hora Caracas GMT-4)*`,
        '',
      ].join('\n'))
      .setColor('#FFD700')
      .setFooter({
        text: `Solicitado por ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinoxs
