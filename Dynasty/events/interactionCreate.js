const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const Jugador = require('../models/Jugador');
const config = require('../data/config.json'); 
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) { 
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    const { guild, user, channel, member } = interaction; 

    if (customId.startsWith('confirmar_stats_') || customId.startsWith('cancelar_stats_')) {
      const messageId = customId.split('_').pop();
      const tempStats = client.tempStats?.get(messageId);

      if (!tempStats) {
        return interaction.reply({
          content: '⛔ Esta interacción ya expiró (5 minutos)',
          ephemeral: true
        });
      }

      if (user.id !== tempStats.autorId) {
        return interaction.reply({
          content: '⛔ Solo el autor del mensaje puede usar estos botones.',
          ephemeral: true
        });
      }

      await interaction.deferUpdate();
      await interaction.message.edit({ components: [] });

      if (customId.startsWith('cancelar_stats_')) {
        client.tempStats.delete(messageId);
        return interaction.followUp({
          content: '❌ Estadísticas canceladas',
          ephemeral: true
        });
      }

      const { jugadorId, competencia, stats } = tempStats;

      try {
        console.log(`Guardando estadísticas para jugadorId=${jugadorId} en competencia=${competencia}:`, stats);

        const jugadorActualizado = await Jugador.updateStats(jugadorId, competencia, stats);

        if (!jugadorActualizado) {
          return interaction.followUp({
            content: '⛔ Jugador no encontrado',
            ephemeral: true
          });
        }

        const confirmado = await Jugador.findByPk(jugadorId);
        console.log('Estado tras guardar:', confirmado.estadisticas);

        const statsComp = confirmado.estadisticas[competencia] || {};
        const statsTotal = confirmado.estadisticas.totales || {};

        const embed = new EmbedBuilder()
          .setTitle('✅ Estadísticas actualizadas')
          .setDescription(`Datos actualizados para **${jugadorActualizado.nombre}** en **${competencia}**`)
          .addFields(
            { name: '⚽ Goles', value: `${statsComp.goles || 0} (Total: ${statsTotal.goles || 0})`, inline: true },
            { name: '🎯 Asistencias', value: `${statsComp.asistencias || 0} (Total: ${statsTotal.asistencias || 0})`, inline: true },
            { name: '🧤 Vallas invictas', value: `${statsComp.vallas || 0} (Total: ${statsTotal.vallas || 0})`, inline: true },
            { name: '😅 Autogoles', value: `${statsComp.autogoles || 0} (Total: ${statsTotal.autogoles || 0})`, inline: true }
          )
          .setColor('#2ecc71');

        await interaction.followUp({ embeds: [embed] });
        client.tempStats.delete(messageId); 
      } catch (err) {
        console.error('❌ Error al guardar estadísticas:', err);
        await interaction.followUp({
          content: '⛔ Error al guardar estadísticas',
          ephemeral: true
        });
      }
      return; 
    }

    if (customId === 'crear_ticket') {
      await handleTicketCreation(interaction, guild, user);
      return;
    }

    if (customId === 'cerrar_ticket') {
      await handleTicketClosure(interaction, guild, member, channel);
      return;
    }
  }
};

async function handleTicketCreation(interaction, guild, user) {
  try {
    const existingTicket = guild.channels.cache.find(ch =>
      ch.name === `ticket-${user.username.toLowerCase()}` &&
      ch.type === ChannelType.GuildText
    );

    if (existingTicket) {
      return await interaction.reply({
        content: `Ya tienes un ticket abierto: ${existingTicket}`,
        ephemeral: true
      });
    }

    const ticketCategory = guild.channels.cache.get(config.canal_tickets)?.parent;
    if (!ticketCategory) {
      return interaction.reply({
        content: 'Configuración de tickets no encontrada',
        ephemeral: true
      });
    }

    const channelPermissions = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      ...getStaffPermissions(guild, config)
    ];

    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      permissionOverwrites: channelPermissions
    });

    await sendTicketWelcomeMessage(ticketChannel, user);
    await notifyStaff(guild, config, user, ticketChannel);

    await interaction.reply({
      content: `Ticket creado: ${ticketChannel}`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    await interaction.reply({
      content: 'Error al crear el ticket',
      ephemeral: true
    });
  }
}

async function handleTicketClosure(interaction, guild, member, channel) {
  if (!hasClosePermission(member, config)) {
    return await interaction.reply({
      content: 'No tienes permiso para cerrar este ticket',
      ephemeral: true
    });
  }

  try {
    await generateTicketLog(guild, channel, config);
    await channel.delete('Ticket cerrado');
  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.reply({
      content: 'Error al cerrar el ticket',
      ephemeral: true
    });
  }
}

function getStaffPermissions(guild, config) {
  const staffRoles = [config.rol_ayudante, config.rol_organizador];
  const botId = guild.members.me.id;

  return [
    ...staffRoles.map(roleId => ({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    })),
    {
      id: botId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels
      ]
    }
  ];
}

async function sendTicketWelcomeMessage(channel, user) {
  const embed = new EmbedBuilder()
    .setTitle(`Ticket de ${user.username}`)
    .setDescription('Por favor describe tu consulta. Un miembro del equipo te atenderá pronto.')
    .setColor('#4CAF50');

  const closeButton = new ButtonBuilder()
    .setCustomId('cerrar_ticket')
    .setLabel('Cerrar Ticket')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(closeButton);

  await channel.send({
    content: `${user}`,
    embeds: [embed],
    components: [row]
  });
}

async function notifyStaff(guild, config, user, channel) {
  const staffRole = guild.roles.cache.get(config.rol_ayudante);
  if (staffRole) {
    const embed = new EmbedBuilder()
      .setTitle('Nuevo Ticket Creado')
      .setDescription(`Usuario: ${user}\nCanal: ${channel}`)
      .setColor('#FFA500')
      .setTimestamp();

    await staffRole.send({ embeds: [embed] });
  }
}

function hasClosePermission(member, config) {
  return member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    member.roles.cache.has(config.rol_organizador) ||
    member.roles.cache.has(config.rol_ayudante);
}

async function generateTicketLog(guild, channel, config) {
  const messages = await channel.messages.fetch();
  const logContent = messages.reverse().map(msg => {
    return `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}`;
  }).join('\n');

  const logPath = path.join(__dirname, `../logs/ticket_${channel.id}.txt`);
  fs.writeFileSync(logPath, logContent);

  const logChannel = guild.channels.cache.get(config.canal_logs);
  if (logChannel) {
    await logChannel.send({
      content: `Registro del ticket ${channel.name}`,
      files: [logPath]
    });
  }
}