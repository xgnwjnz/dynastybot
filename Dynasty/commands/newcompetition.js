const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../data/competition_channels.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newcompetition')
    .setDescription('Crea una nueva competencia y canal para estadísticas')
    .addStringOption(opt =>
      opt.setName('nombre')
        .setDescription('Nombre corto de la competencia (ej. liga, copa)')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal donde se escribirán estadísticas')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
     if (!interaction.member.roles.cache.has(config.rol_organizador)) {
      return interaction.reply({
        content: '🚫 *No tienes permisos para usar este comando.* Need: `Organizador`',
        ephemeral: true
      });
    }
    
    const nombre = interaction.options.getString('nombre').toLowerCase();
    let canal = interaction.options.getChannel('canal');
    const guild = interaction.guild;

    let lista = {};
    if (fs.existsSync(jsonPath)) {
      lista = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    if (Object.values(lista).includes(nombre)) {
      return interaction.reply({
        content: `⚠️ La competencia \`${nombre}\` ya existe.`,
        ephemeral: true
      });
    }

    if (!canal) {
      canal = await guild.channels.create({
        name: `add-${nombre}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.SendMessages]
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.SendMessages]
          }
        ]
      });
    }

    lista[canal.id] = nombre;
    fs.writeFileSync(jsonPath, JSON.stringify(lista, null, 2));

    const embed = new EmbedBuilder()
      .setTitle('✅ Competencia creada')
      .setDescription(`Se ha creado la competencia **${nombre}**`)
      .addFields(
        { name: 'Canal asignado', value: `<#${canal.id}>`, inline: true },
        { name: 'Formato de estadísticas', value: 'Usa `@jugador g2 a1 cs1 og1`', inline: true }
      )
      .setColor('#2ecc71');

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};