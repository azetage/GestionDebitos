import { db_debitos } from "../config/db.js";
import { DataTypes } from 'sequelize';

const DebitosTotales = db_debitos.define('DebitosTotalesAux', {
    FECHA:        { type: DataTypes.STRING, allowNull: false },
    OPERATORIA:   { type: DataTypes.STRING, allowNull: false },
    COD:          { type: DataTypes.STRING, allowNull: false },
    COD_DEB:      { type: DataTypes.STRING, allowNull: false },
    SIGLA:        { type: DataTypes.STRING, allowNull: false },
    SUCURSAL:     { type: DataTypes.STRING, allowNull: false },
    NRO_AGENTE:   { type: DataTypes.STRING, allowNull: false },
    DNI_DESC:     { type: DataTypes.STRING, allowNull: false },
    APEYNOM:      { type: DataTypes.STRING, allowNull: false },
    MTO_CUO:      { type: DataTypes.DECIMAL(10,2), allowNull: false },
    cantidad:     { type: DataTypes.STRING, allowNull: false },
},{
  indexes: [
    {
      unique: true,
      fields: ['COD', 'NRO_AGENTE', 'FECHA']
    }
  ],

    timestamps: false,
    freezeTableName: true
});

export default DebitosTotales;