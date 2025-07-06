const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newteam')
    .setDescription('Añade un nuevo equipo al sistema')
    .setDefaultMemberPermissions(0x8) // Solo usuarios con permisos de administrador
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
    // Verificar permisos primero
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

    // Resto del código permanece igual...
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

    // Guardar logo
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

    // Objeto TEAM
    const nuevoEquipo = {
      nombre: nombre,
      id: rol.id,
      abreviacion: abreviacion,
      uniformes: {
        local: uniformeLocal,
        visitante: uniformeVisitante
      }
    };

    teamsData.equipos.push(nuevoEquipo);

    try {
      fs.writeFileSync(teamsPath, JSON.stringify(teamsData, null, 2));
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Nuevo equipo registrado')
        .setDescription('El equipo ha sido añadido a la configuración')
        .addFields(
          { name: 'Nombre de equipo', value: nombre, inline: true },
          { name: 'Abreviación', value: abreviacion, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }, 
          { name: 'Uniformes', value: '**Local:**\n' + uniformeLocal + '\n**Visitante:**\n' + (uniformeVisitante || 'No definido'), inline: false }
        )
        .setColor('#0099ff')
        .setThumbnail(`attachment://${logoFileName}`)
        .setFooter({ text: 'Nota: El equipo solo está listado en la configuración. Usa /regall para añadirlo a la base de datos.' });

      return interaction.editReply({
        content: '¡Nuevo equipo registrado con éxito!',
        embeds: [embed],
        files: [new AttachmentBuilder(logoPath, { name: logoFileName })]
      });
    } catch (error) {
      console.error('Error al guardar teams.json:', error);
      return interaction.editReply({
        content: '❌ Error al guardar el nuevo equipo'
      });
    }
  }
};