const {SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const trophys = require('../data/trophys.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historial')
    .setDescription('🏅 Muestra títulos y premios individuales por temporada'),

  async execute(interaction) {
    await interaction.deferReply();

    const extraerTemporada = nombre => nombre.match(/\bT\d{1,2}\b/)?.[0] || null;

    const agruparPorTemporada = lista => {
      const map = {};
      for (const item of lista) {
        const temp = extraerTemporada(item.nombre);
        if (!temp) continue;
        if (!map[temp]) map[temp] = [];
        map[temp].push(item);
      }
      return map;
    };

    const titulosPorTemp = agruparPorTemporada(trophys.titulos);
    const premiosPorTemp = agruparPorTemporada(trophys.premios_individuales);
    const temporadas = [...new Set([...Object.keys(titulosPorTemp), ...Object.keys(premiosPorTemp)])]
      .sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)));

    if (temporadas.length === 0) {
      return interaction.editReply({
        content: '❌ No se encontraron títulos ni premios con temporada válida (ej: "T2", "T10").',
        ephemeral: true
      });
    }

    const construirEmbed = temporada => {
      const embed = new EmbedBuilder()
        .setTitle(`📅 Historial - Temporada ${temporada}`)
        .setColor('#3498db')
        .setFooter({ text: 'Mostrando usuarios con el rol correspondiente' });

      let contenido = '';

      const agregarSeccion = (titulo, items) => {
        if (!items?.length) return;
        contenido += `**${titulo}**\n`;
        for (const item of items) {
          const ganadores = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(item.id)
          );
          const lista = ganadores.size
            ? ganadores.map(m => `• <@${m.id}>`).join('\n')
            : '_Sin ganadores registrados_';
          contenido += `🔸 *${item.nombre}*\n${lista}\n\n`;
        }
        contenido += 'n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
      };

      agregarSeccion('🏆 Títulos', titulosPorTemp[temporada]);
      agregarSeccion('🎖️ Premios Individuales', premiosPorTemp[temporada]);

      embed.setDescription(contenido || 'No hay datos registrados en esta temporada.');
      return embed;
    };

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('menu_temporada')
      .setPlaceholder('📅 Cambiar temporada')
      .addOptions(
        temporadas.map(temp => ({
          label: `Temporada ${temp}`,
          value: temp,
          emoji: '📅'
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      embeds: [construirEmbed(temporadas[0])],
      components: [row]
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id && i.customId === 'menu_temporada',
      idle: 15_000, 
      time: 5 * 60_000 
    });

    collector.on('collect', async i => {
      const temp = i.values[0];
      await i.update({ embeds: [construirEmbed(temp)], components: [row] });
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'idle') {
        const closedEmbed = new EmbedBuilder()
          .setColor('#808080')
          .setDescription('📪 **Menú cerrado por inactividad**');

        await interaction.editReply({ embeds: [closedEmbed], components: [] }).catch(() => {});
      } else {
        await interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox