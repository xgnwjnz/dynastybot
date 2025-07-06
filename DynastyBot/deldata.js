const sequelize = require('./utils/database');
const Jugador = require('./models/Jugador');
const Equipo = require('./models/Equipo');

async function deleteAllData() {
    try {
        await sequelize.sync();
        
        await Jugador.destroy({ where: {}, truncate: true });
        await Equipo.destroy({ where: {}, truncate: true });

        console.log('Se ha eleminado.');
    } catch (error) {
        console.error('Error al eliminar los datos:', error);
    } finally {
        await sequelize.close();
    }
}

deleteAllData();