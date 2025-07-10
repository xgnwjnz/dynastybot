const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../data/config.json');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Abre un nuevo sistema de tickets.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const rolOrganizador = config.rol_organizador;
    const canalTickets = interaction.guild.channels.cache.get(config.canal_tickets);

    if (!interaction.member.roles.cache.has(rolOrganizador)) {
      return interaction.reply({
        content: '❌ Solo los miembros con el rol Organizador pueden usar este comando.',
        ephemeral: true,
      });
    }

    if (!canalTickets) {
      return interaction.reply({
        content: '❌ No se encontró el canal de tickets. Verifica la configuración.',
        ephemeral: true,
      });
    }

    const fondoPath = path.join(__dirname, '../Logos', 'ticketsfondo.png');
    const fondoExists = fs.existsSync(fondoPath);
    const fondoAttachment = fondoExists ? { attachment: fondoPath, name: 'ticketsfondo.png' } : null;

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Sistema de Tickets')
      .setDescription('Haz clic en el botón para crear un nuevo ticket.')
      .setColor('#00AAFF')
      .setImage('attachment://ticketsfondo.png'); 

    const button = new ButtonBuilder()
      .setCustomId('crear_ticket')
      .setLabel('🎫 Crear Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await canalTickets.send({
      embeds: [embed],
      files: [fondoAttachment].filter(Boolean), 
      components: [row],
    });

    await interaction.reply({
      content: '✅ El sistema de tickets ha sido activado correctamente.',
      ephemeral: true,
    });
  },
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox