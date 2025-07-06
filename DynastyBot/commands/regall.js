const { SlashCommandBuilder } = require('discord.js');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');
const config = require('../data/config.json');
const teams = require('../data/teams.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regall')
    .setDescription('Registra todos los equipos y jugadores en la base de datos.')
    .setDefaultMemberPermissions(0x8), 

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ content: 'No tienes permisos para ejecutar este comando.', ephemeral: true });
      }

      const equiposRegistrados = [];
      for (const equipoConfig of teams.equipos) {
        const [equipo, creado] = await Equipo.findOrCreate({
          where: { nombre: equipoConfig.nombre },
          defaults: {
            abreviacion: equipoConfig.abreviacion,
            fichajes_emergencia: 3 
          }
        });
        if (creado) {
          equiposRegistrados.push(equipo.nombre);
        }
      }

      let jugadoresRegistrados = 0;
      for (const equipoConfig of teams.equipos) {
        const rolEquipo = interaction.guild.roles.cache.get(equipoConfig.id);
        if (!rolEquipo) continue;

        const miembrosConRol = interaction.guild.members.cache.filter(miembro => miembro.roles.cache.has(rolEquipo.id));
        for (const [id, miembro] of miembrosConRol) {
          const [jugador, creado] = await Jugador.findOrCreate({
            where: { discordId: id },
            defaults: {
              nombre: miembro.user.tag,
              equipo: equipoConfig.nombre,
              abreviacion: equipoConfig.abreviacion
            }
          });

          if (creado) {
            jugadoresRegistrados++;

            // Asignar la abreviación al globalName del jugador
            const nuevoGlobalName = `#${equipoConfig.abreviacion} ${miembro.user.globalName || miembro.user.username}`;
            await miembro.setNickname(nuevoGlobalName).catch(error => {
              console.error(`Error al establecer el globalName: ${error.message}`);
            });
          }
        }
      }

      await interaction.reply({
        content: `Se han registrado ${equiposRegistrados.length} equipos y ${jugadoresRegistrados} jugadores en la base de datos!`,
        ephemeral: true
      });

    } catch (error) {
      console.error(error);
      interaction.reply({ content: 'Hubo un error al registrar los equipos y jugadores.', ephemeral: true });
    }
  }
};