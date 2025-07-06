const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const trophys = require('../data/trophys.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premios')
    .setDescription('Consulta los premios registrados y sus ganadores.'),

  async execute(interaction) {
    try {
      const premios = trophys.premios_individuales;

      let premiosList = '';
      for (const premio of premios) {
        const ganadores = interaction.guild.members.cache.filter(member => 
          member.roles.cache.has(premio.id)
        );

        if (ganadores.size > 0) {
          const ganadoresList = ganadores.map(ganador => `<@${ganador.id}>`).join(', ');
          premiosList += `**${premio.nombre}:** ${ganadoresList}\n`;
        } else {
          premiosList += `**${premio.nombre}:** Nadie tiene este premio...\n`;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Lista de Premios y Ganadores')
        .setDescription(premiosList)
        .setColor('#FFD700')
        .setTimestamp();

      interaction.reply({ embeds: [embed], ephemeral: false });

    } catch (error) {
      console.error(`Error al ejecutar el comando /premios: ${error.message}`);
      interaction.reply({ content: '❌ Hubo un error al procesar tu solicitud.', ephemeral: true });
    }
  }
};