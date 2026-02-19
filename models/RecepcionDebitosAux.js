import { db_debitos } from "../config/db.js";
import { DataTypes } from 'sequelize';

const RecepcionDebitosAux = db_debitos.define('RecepcionDebitosAux', {
    ORGANISMO:    { type: DataTypes.STRING, allowNull: true },
    PERIODO:      { type: DataTypes.STRING, allowNull: true },
    NRO_AGENTE:   { type: DataTypes.STRING, allowNull: true },
    DNI_DESC:     { type: DataTypes.STRING, allowNull: true },
    APEYNOM:      { type: DataTypes.STRING, allowNull: true },
    MONTO:        { type: DataTypes.DECIMAL(10,2), allowNull: true },
    
},{
  // indexes: [
  //   {
  //     unique: true,
  //   //  fields: ['DNI_DESC', 'NRO_AGENTE', 'APEYNOM']
  //   }
  // ],

    timestamps: false,
    freezeTableName: true
});

export default RecepcionDebitosAux;