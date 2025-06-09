import {DataTypes} from 'sequelize'
import bcrypt from 'bcrypt'
import { db_debitos } from '../config/db.js';

const Usuario = db_debitos.define('usuarios',{
    nombre:{    type: DataTypes.STRING,     allowNull: false    },
    password:{  type: DataTypes.STRING,     allowNull: false    },
},
     {
    // hooks: {
    //     beforeCreate: async function(usuario) {
    //         const salt = await bcrypt.genSalt(10)
    //         usuario.password = await bcrypt.hash( usuario.password, salt);
    //     }
    // }
})

export default Usuario

//datatypes los encontras en SEQUELIZE