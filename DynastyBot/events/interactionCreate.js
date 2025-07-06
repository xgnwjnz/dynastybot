const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField,ChannelType} = require('discord.js');
const config = require('../data/config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const { guild, user, channel, member } = interaction;
    const logsDir = path.join(__dirname, '../logs');

    // Crear directorio de logs si no existe
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Handler para creación de tickets
    if (interaction.customId === 'crear_ticket') {
      await handleTicketCreation(interaction, guild, user);
    }

    // Handler para cierre de tickets
    if (interaction.customId === 'cerrar_ticket') {
      await handleTicketClosure(interaction, guild, member, channel);
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