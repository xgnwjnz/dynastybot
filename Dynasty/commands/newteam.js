const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newteam')
    .setDescription('Añade un nuevo equipo al sistema')
    .setDefaultMemberPermissions(0x8) 
    .addStringOption(option =>
      option.setName('nombre')
        .setDescription('Nombre completo del equipo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('abreviacion')
        .setDescription('Abreviación del equipo (3 letras)')
        .setRequired(true)
        .setMaxLength(3)
        .setMinLength(3)
    )
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('Rol de Discord asociado al equipo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('uniforme_local')
        .setDescription('Comando de uniforme local (/colors red 60 COLOR1 COLOR2)')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('logo')
        .setDescription('Logo del equipo (imagen)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('uniforme_visitante')
        .setDescription('Comando de uniforme visitante (/colors blue 30 COLOR1 COLOR2)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ 
        content: '❌ Solo los administradores pueden registrar nuevos equipos',
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: false });

    const nombre = interaction.options.getString('nombre');
    const abreviacion = interaction.options.getString('abreviacion').toUpperCase();
    const rol = interaction.options.getRole('rol');
    const uniformeLocal = interaction.options.getString('uniforme_local');
    const uniformeVisitante = interaction.options.getString('uniforme_visitante') || null;
    const logoAttachment = interaction.options.getAttachment('logo');

    if (!logoAttachment.contentType.startsWith('image/')) {
      return interaction.editReply({
        content: '⚠️ El archivo proporcionado no es una imagen válida'
      });
    }

    const teamsPath = path.join(__dirname, '../data/teams.json');
    let teamsData;
    
    try {
      teamsData = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
    } catch (error) {
      console.error('Error al leer teams.json:', error);
      return interaction.editReply({
        content: '❌ Error al leer el archivo de equipos'
      });
    }

    if (teamsData.equipos.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
      return interaction.editReply({
        content: '⚠️ Ya existe un equipo con ese nombre'
      });
    }

    if (teamsData.equipos.some(e => e.abreviacion.toUpperCase() === abreviacion)) {
      return interaction.editReply({
        content: '⚠️ Esa abreviación ya está en uso por otro equipo'
      });
    }

    if (teamsData.equipos.some(e => e.id === rol.id)) {
      return interaction.editReply({
        content: '⚠️ Ese rol ya está asignado a otro equipo'
      });
    }

    if (!uniformeLocal.startsWith('/colors')) {
      return interaction.editReply({
        content: '⚠️ El uniforme local debe comenzar con /colors'
      });
    }

    const logosDir = path.join(__dirname, '../logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }

    const logoExtension = logoAttachment.url.split('.').pop().split('?')[0];
    const logoFileName = `${abreviacion}.${logoExtension}`;
    const logoPath = path.join(logosDir, logoFileName);

    try {
      const response = await fetch(logoAttachment.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(logoPath, Buffer.from(buffer));
    } catch (error) {
      console.error('Error al guardar el logo:', error);
      return interaction.editReply({
        content: '❌ Error al guardar el logo del equipo'
      });
    }

    const nuevoEquipo = {
      nombre: nombre,
      id: rol.id,
      abreviacion: abreviacion,
      uniformes: {
        local: uniformeLocal,
        visitante: uniformeVisitante || 'ninguno'
      }
    };

    const embed = new EmbedBuilder()
      .setTitle('🆕 Nuevo equipo registrado')
      .setDescription('Revisa los datos y confirma para añadir a la base de datos')
      .addFields(
        { name: 'Nombre', value: nombre, inline: true },
        { name: 'Abreviación', value: abreviacion, inline: true },
        { name: 'Rol', value: rol.toString(), inline: true },
        { name: 'Uniforme local', value: uniformeLocal, inline: false },
        { name: 'Uniforme visitante', value: uniformeVisitante || 'Ninguno', inline: false }
      )
      .setColor('#0099ff')
      .setThumbnail(`attachment://${logoFileName}`);

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('añadir_aceptar')
        .setLabel('Añadir ahora')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('añadir_rechazar')
        .setLabel('Añadir después')
        .setStyle(ButtonStyle.Danger)
    );

    const mensaje = await interaction.editReply({
      content: '¿Quieres añadir este equipo ahora a la base de datos o prefieres hacerlo después con /regall?',
      embeds: [embed],
      files: [new AttachmentBuilder(logoPath, { name: logoFileName })],
      components: [botones]
    });

    const filter = i => {
      return i.user.id === interaction.user.id && 
             (i.customId === 'añadir_aceptar' || i.customId === 'añadir_rechazar');
    };

    const collector = mensaje.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      try {
        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('añadir_aceptar_disabled')
            .setLabel('Procesando...')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('añadir_rechazar_disabled')
            .setLabel('Procesando...')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await i.update({
          components: [disabledButtons]
        });

        if (i.customId === 'añadir_rechazar') {
          teamsData.equipos.push(nuevoEquipo);
          fs.writeFileSync(teamsPath, JSON.stringify(teamsData, null, 2));
          
          await i.editReply({
            content: '✅ Equipo añadido al archivo de configuración. Usa `/regall` más tarde para completar el registro.',
            embeds: [],
            components: []
          });
          return;
        }

        const maxId = await Equipo.max('equipoId') || 100;
        const equipoId = maxId + 1;

        nuevoEquipo.equipoId = equipoId;
        teamsData.equipos.push(nuevoEquipo);
        fs.writeFileSync(teamsPath, JSON.stringify(teamsData, null, 2));

        await Equipo.create({
          equipoId: equipoId,
          nombre: nombre,
          abreviacion: abreviacion,
          fichajes_emergencia: 3
        });

        const miembros = await interaction.guild.members.fetch();
        const miembrosConRol = miembros.filter(m => m.roles.cache.has(rol.id));

        let jugadoresActualizados = 0;
        for (const [id, miembro] of miembrosConRol) {
          const [jugador, creado] = await Jugador.findOrCreate({
            where: { discordId: id },
            defaults: {
              nombre: miembro.user.tag,
              equipo: nombre
            }
          });

          if (!creado) {
            await jugador.update({
              equipo: nombre
            });
          }

          try {
            await miembro.setNickname(
              `#${abreviacion} ${miembro.user.globalName || miembro.user.username}`
            );
            jugadoresActualizados++;
          } catch (error) {
            console.error(`Error al actualizar nick: ${error.message}`);
          }
        }

        const embedExito = new EmbedBuilder()
          .setTitle('✅ Equipo añadido con éxito')
          .setDescription('El equipo ha sido registrado en la base de datos')
          .addFields(
            { name: 'Nombre', value: nombre, inline: true },
            { name: 'Abreviación', value: abreviacion, inline: true },
            { name: 'ID de equipo', value: equipoId.toString(), inline: true },
            { name: 'Rol', value: rol.toString(), inline: true },
            { name: 'Jugadores actualizados', value: jugadoresActualizados.toString(), inline: true }
          )
          .setColor('#00ff00')
          .setThumbnail(`attachment://${logoFileName}`);

        await i.editReply({
          content: '',
          embeds: [embedExito],
          files: [new AttachmentBuilder(logoPath, { name: logoFileName })],
          components: []
        });

      } catch (error) {
        console.error('Error al procesar botón:', error);
        await i.followUp({
          content: '❌ Ocurrió un error al procesar la acción',
          ephemeral: true
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({
          content: '⏱️ Tiempo agotado. Usa `/regall` más tarde para añadir este equipo.',
          ephemeral: true
        });
      }
    });
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox