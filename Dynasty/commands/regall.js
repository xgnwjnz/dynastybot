const { SlashCommandBuilder } = require('discord.js');
const { Op } = require('sequelize');
const Jugador = require('../models/Jugador');
const Equipo = require('../models/Equipo');
const fs = require('fs');
const path = require('path');
const teams = require('../data/teams.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regall')
    .setDescription('Sincroniza todos los equipos y jugadores con la base de datos')
    .setDefaultMemberPermissions(0x8),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const equipos = teams.equipos;
      const duplicados = {
        ids: {},
        nombres: {},
        abreviaciones: {}
      };

      for (const equipo of equipos) {
        if (equipo.equipoId) {
          if (duplicados.ids[equipo.equipoId]) {
            duplicados.ids[equipo.equipoId].push(equipo.nombre);
          } else {
            duplicados.ids[equipo.equipoId] = [equipo.nombre];
          }
        }

        if (duplicados.nombres[equipo.nombre]) {
          duplicados.nombres[equipo.nombre].push(equipo.equipoId || 'Sin ID');
        } else {
          duplicados.nombres[equipo.nombre] = [equipo.equipoId || 'Sin ID'];
        }

        if (duplicados.abreviaciones[equipo.abreviacion]) {
          duplicados.abreviaciones[equipo.abreviacion].push(equipo.nombre);
        } else {
          duplicados.abreviaciones[equipo.abreviacion] = [equipo.nombre];
        }
      }

      const problemas = {};
      for (const [id, nombres] of Object.entries(duplicados.ids)) {
        if (nombres.length > 1) {
          if (!problemas.ids) problemas.ids = {};
          problemas.ids[id] = nombres;
        }
      }
      for (const [nombre, ids] of Object.entries(duplicados.nombres)) {
        if (ids.length > 1) {
          if (!problemas.nombres) problemas.nombres = {};
          problemas.nombres[nombre] = ids;
        }
      }
      for (const [abreviacion, nombres] of Object.entries(duplicados.abreviaciones)) {
        if (nombres.length > 1) {
          if (!problemas.abreviaciones) problemas.abreviaciones = {};
          problemas.abreviaciones[abreviacion] = nombres;
        }
      }

      if (Object.keys(problemas).length > 0) {
        let mensajeError = '❌ Se encontraron los siguientes conflictos en teams.json:\n';

        if (problemas.ids) {
          mensajeError += '\n🔹 Equipos con el mismo ID:\n';
          for (const [id, nombres] of Object.entries(problemas.ids)) {
            mensajeError += `- ID ${id}: ${nombres.join(', ')}\n`;
          }
        }

        if (problemas.nombres) {
          mensajeError += '\n🔹 Equipos con el mismo nombre:\n';
          for (const [nombre, ids] of Object.entries(problemas.nombres)) {
            mensajeError += `- ${nombre}: IDs ${ids.join(', ')}\n`;
          }
        }

        if (problemas.abreviaciones) {
          mensajeError += '\n🔹 Equipos con la misma abreviación:\n';
          for (const [abreviacion, nombres] of Object.entries(problemas.abreviaciones)) {
            mensajeError += `- ${abreviacion}: ${nombres.join(', ')}\n`;
          }
        }

        mensajeError += '\nPor favor edita manualmente teams.json para corregir estos conflictos, luego reinicia el bot y vuelve a ejecutar el comando.';
        
        return await interaction.editReply({
          content: mensajeError
        });
      }

      const resultados = {
        equipos: { nuevos: 0, actualizados: 0, eliminados: 0 },
        jugadores: { nuevos: 0, actualizados: 0 }
      };

      const maxId = await Equipo.max('equipoId') || 100;
      let nextId = maxId + 1;

      const equiposDB = await Equipo.findAll();
      
      for (const equipoDB of equiposDB) {
        const existeEnJson = teams.equipos.some(e => e.equipoId === equipoDB.equipoId);

        if (!existeEnJson) {
          await Jugador.update(
            { equipo: 'Agente Libre', abreviacion: 'AL' },
            { where: { equipo: equipoDB.nombre } }
          );
          await equipoDB.destroy();
          resultados.equipos.eliminados++;
        }
      }

      for (const equipoJson of teams.equipos) {
        let equipo;
        
        if (equipoJson.equipoId) {
          equipo = await Equipo.findByPk(equipoJson.equipoId);
        }

        if (!equipo) {
          equipo = await Equipo.findOne({ where: { nombre: equipoJson.nombre } });
        }

        if (equipo) {
          const cambios = {};
          if (equipo.nombre !== equipoJson.nombre) cambios.nombre = equipoJson.nombre;
          if (equipo.abreviacion !== equipoJson.abreviacion) cambios.abreviacion = equipoJson.abreviacion;

          if (Object.keys(cambios).length > 0) {
            await equipo.update(cambios);
            resultados.equipos.actualizados++;

            if (cambios.nombre) {
              await Jugador.update(
                { equipo: equipoJson.nombre },
                { where: { equipo: equipo.nombre } }
              );
            }
          }

          if (!equipoJson.equipoId || equipoJson.equipoId !== equipo.equipoId) {
            equipoJson.equipoId = equipo.equipoId;
          }
        } else {
          equipo = await Equipo.create({
            equipoId: nextId++,
            nombre: equipoJson.nombre,
            abreviacion: equipoJson.abreviacion,
            fichajes_emergencia: 3
          });
          resultados.equipos.nuevos++;
          
          equipoJson.equipoId = equipo.equipoId;
        }
      }

      fs.writeFileSync(
        path.join(__dirname, '../data/teams.json'),
        JSON.stringify(teams, null, 2)
      );

      for (const equipoJson of teams.equipos) {
        const rol = interaction.guild.roles.cache.get(equipoJson.id);
        if (!rol) continue;

        const miembros = await interaction.guild.members.fetch();
        const miembrosConRol = miembros.filter(m => m.roles.cache.has(rol.id));

        for (const [id, miembro] of miembrosConRol) {
          const [jugador, creado] = await Jugador.findOrCreate({
            where: { discordId: id },
            defaults: {
              nombre: miembro.user.tag,
              equipo: equipoJson.nombre,
              abreviacion: equipoJson.abreviacion
            }
          });

          if (!creado) {
            if (jugador.equipo !== equipoJson.nombre || 
                jugador.abreviacion !== equipoJson.abreviacion) {
              await jugador.update({
                equipo: equipoJson.nombre,
                abreviacion: equipoJson.abreviacion
              });
              resultados.jugadores.actualizados++;
            }
          } else {
            resultados.jugadores.nuevos++;
          }

          try {
            await miembro.setNickname(
              `#${equipoJson.abreviacion} ${miembro.user.globalName || miembro.user.username}`
            );
          } catch (error) {
            console.error(`Error al actualizar nick: ${error.message}`);
          }
        }
      }

      await interaction.editReply({
        content: [
          '✅ Sincronización completada:',
          `- Equipos nuevos: ${resultados.equipos.nuevos}`,
          `- Equipos actualizados: ${resultados.equipos.actualizados}`,
          `- Equipos eliminados: ${resultados.equipos.eliminados}`,
          `- Jugadores nuevos: ${resultados.jugadores.nuevos}`,
          `- Jugadores actualizados: ${resultados.jugadores.actualizados}`
        ].join('\n')
      });

    } catch (error) {
      console.error('Error en regall:', error);
      await interaction.editReply({
        content: '❌ Error durante la sincronización. Verifica la consola.'
      });
    }
  }
};

// © 2025 Keury. Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es
// GitHub: https://github.com/KvensOs/iDinox