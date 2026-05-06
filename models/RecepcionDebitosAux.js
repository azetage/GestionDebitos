import { db_debitos } from "../config/db.js";
import { DataTypes } from 'sequelize';

const RecepcionDebitosAux = db_debitos.define('RecepcionDebitosAux', {
    ORGANISMO:    { type: DataTypes.STRING, allowNull: true },
    COD_DEB:      { type: DataTypes.INTEGER, allowNull: false },
    PERIODO:      { type: DataTypes.STRING, allowNull: true },
    NRO_AGENTE:   { type: DataTypes.BIGINT, allowNull: true },
    DNI_DESC:     { type: DataTypes.BIGINT, allowNull: true },
    CUIL:         { type: DataTypes.BIGINT, allowNull: true },
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