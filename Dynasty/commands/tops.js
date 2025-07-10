const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Jugador = require('../models/Jugador');
const fs = require('fs');
const path = require('path');

const competitionChannelsPath = path.join(__dirname, '../data/competition_channels.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tops')
    .setDescription('📊 Muestra los tops de estadísticas de jugadores.')
    .addStringOption(option =>
      option.setName('competicion')
        .setDescription('Selecciona la competición para ver los tops (dejar vacío para global).')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    let competitionChannels = {};
    if (fs.existsSync(competitionChannelsPath)) {
      competitionChannels = JSON.parse(fs.readFileSync(competitionChannelsPath, 'utf8'));
    }

    const competitionNames = [...new Set(Object.values(competitionChannels))];

    const allCompetitionOptions = ['Totales', ...competitionNames];

    const filtered = allCompetitionOptions.filter(choice =>
      choice.toLowerCase().includes(focusedValue.toLowerCase())
    );
    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    const selectedCompetition = interaction.options.getString('competicion') || 'Totales';

    const allPlayers = await Jugador.findAll();

    const getTopPlayer = (players, stat, compName) => {
      let filteredPlayers = players;
      const statPath = compName === 'Totales' ? 'totales' : compName;

      filteredPlayers = players.filter(p => p.estadisticas && p.estadisticas[statPath] && p.estadisticas[statPath][stat] !== undefined);

      const sortedPlayers = filteredPlayers.sort((a, b) => {
        const statA = (a.estadisticas[statPath]?.[stat]) || 0;
        const statB = (b.estadisticas[statPath]?.[stat]) || 0;
        return statB - statA;
      });

      const topPlayer = sortedPlayers[0];
      return topPlayer ? `<@${topPlayer.discordId}> con **${(topPlayer.estadisticas[statPath][stat] || 0)}**` : '_N/A_';
    };

    const buildTopEmbedAndComponents = (allPlayersData, currentComp, currentStatType, currentPageIndex) => {
      const isGlobal = currentComp === 'Totales';
      let embedTitle = `🏆 Tops de Estadísticas ${isGlobal ? 'Globales' : `en ${currentComp}`}`;
      let embedDescription = '';
      const embed = new EmbedBuilder().setColor('#0099ff');
      let components = [];

      if (!currentStatType) {
        embedDescription = `Selecciona la estadística para ver el Top 10 ${isGlobal ? 'global' : `en **${currentComp}**`}.`;
        embed.addFields(
          { name: '⚽ Goles (Top 1)', value: getTopPlayer(allPlayersData, 'goles', currentComp), inline: true },
          { name: '🎯 Asistencias (Top 1)', value: getTopPlayer(allPlayersData, 'asistencias', currentComp), inline: true },
          { name: '🧤 Vallas invictas (Top 1)', value: getTopPlayer(allPlayersData, 'vallas', currentComp), inline: true },
          { name: '😅 Autogoles (Top 1)', value: getTopPlayer(allPlayersData, 'autogoles', currentComp), inline: true }
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_stat_top')
          .setPlaceholder('Selecciona una estadística para ver el Top 10')
          .addOptions([
            { label: 'Goles', value: 'goles', emoji: '⚽' },
            { label: 'Asistencias', value: 'asistencias', emoji: '🎯' },
            { label: 'Vallas invictas', value: 'vallas', emoji: '🧤' },
            { label: 'Autogoles', value: 'autogoles', emoji: '😅' },
          ]);
        components.push(new ActionRowBuilder().addComponents(selectMenu));

      } else { 
        embedTitle = `Top 10 de ${currentStatType.charAt(0).toUpperCase() + currentStatType.slice(1)} ${isGlobal ? 'Global' : `en ${currentComp}`}`;

        const statPath = isGlobal ? 'totales' : currentComp;
        let filteredPlayers = allPlayersData.filter(p => p.estadisticas && p.estadisticas[statPath] && p.estadisticas[statPath][currentStatType] !== undefined);

        const sortedPlayers = filteredPlayers.sort((a, b) => {
          const statA = (a.estadisticas[statPath]?.[currentStatType]) || 0;
          const statB = (b.estadisticas[statPath]?.[currentStatType]) || 0;
          return statB - statA;
        });

        const playersPerPage = 10;
        const totalPages = Math.ceil(sortedPlayers.length / playersPerPage);

        if (currentPageIndex < 0) currentPageIndex = 0;
        if (currentPageIndex >= totalPages) currentPageIndex = totalPages > 0 ? totalPages - 1 : 0;

        const startIndex = currentPageIndex * playersPerPage;
        const endIndex = startIndex + playersPerPage;
        const currentPlayers = sortedPlayers.slice(startIndex, endIndex);

        embedDescription = currentPlayers.length > 0
          ? currentPlayers.map((p, index) => {
              const rank = startIndex + index + 1;
              const statValue = (p.estadisticas[statPath]?.[currentStatType]) || 0;
              return `**${rank}.** <@${p.discordId}>: **${statValue}**`;
            }).join('\n')
          : 'No hay jugadores con estadísticas para mostrar en esta categoría.';

        embed.setFooter({ text: `Página ${currentPageIndex + 1} de ${totalPages || 1}` });

        const prevButton = new ButtonBuilder()
          .setCustomId('prev_page_top')
          .setLabel('⬅️ Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPageIndex === 0);

        const nextButton = new ButtonBuilder()
          .setCustomId('next_page_top')
          .setLabel('Siguiente ➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPageIndex >= totalPages - 1 || totalPages === 0);

        const buttonsRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
        
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_stat_top')
          .setPlaceholder('Cambiar estadística')
          .addOptions([
            { label: 'Goles', value: 'goles', emoji: '⚽', default: currentStatType === 'goles' },
            { label: 'Asistencias', value: 'asistencias', emoji: '🎯', default: currentStatType === 'asistencias' },
            { label: 'Vallas invictas', value: 'vallas', emoji: '🧤', default: currentStatType === 'vallas' },
            { label: 'Autogoles', value: 'autogoles', emoji: '😅', default: currentStatType === 'autogoles' },
          ]);
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        components.push(selectRow, buttonsRow);
      }

      embed.setTitle(embedTitle).setDescription(embedDescription);
      return { embed, components };
    };

    const { embed, components } = buildTopEmbedAndComponents(allPlayers, selectedCompetition, null, 0);
    const replyMessage = await interaction.editReply({ embeds: [embed], components: components });

    const collector = replyMessage.createMessageComponentCollector({
      componentType: [ComponentType.StringSelect, ComponentType.Button],
      filter: i => i.user.id === interaction.user.id,
      idle: 300_000, 
      time: 600_000 
    });

    let currentState = {
      competition: selectedCompetition,
      currentStat: null,
      currentPage: 0
    };

    collector.on('collect', async i => {
      await i.deferUpdate(); 

      if (i.customId === 'select_stat_top') {
        currentState.currentStat = i.values[0];
        currentState.currentPage = 0; 
      } else if (i.customId === 'prev_page_top') {
        currentState.currentPage--;
      } else if (i.customId === 'next_page_top') {
        currentState.currentPage++;
      }

      const { embed: updatedEmbed, components: updatedComponents } = buildTopEmbedAndComponents(
        allPlayers,
        currentState.competition,
        currentState.currentStat,
        currentState.currentPage
      );

      await i.editReply({ embeds: [updatedEmbed], components: updatedComponents });
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' || reason === 'idle') {
        const finalEmbed = EmbedBuilder.from(replyMessage.embeds[0])
          .setDescription('📪 **Menú de tops cerrado por inactividad.**')
          .setColor('#808080')
          .setFooter(null); 

        await replyMessage.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
      } else {
        await replyMessage.edit({ components: [] }).catch(() => {});
      }
    });
  },
};