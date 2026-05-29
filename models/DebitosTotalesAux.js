import { db_debitos } from "../config/db.js";
import { DataTypes } from 'sequelize';

const DebitosTotalesAux = db_debitos.define('DebitosTotalesAux', {
    FECHA:        { type: DataTypes.STRING, allowNull: false },
    OPERATORIA:   { type: DataTypes.STRING, allowNull: false },
    COD:          { type: DataTypes.INTEGER, allowNull: false },
    COD_DEB:      { type: DataTypes.INTEGER, allowNull: false },
    SIGLA:        { type: DataTypes.STRING, allowNull: false },
    SUCURSAL:     { type: DataTypes.STRING, allowNull: false },
    NRO_AGENTE:   { type: DataTypes.BIGINT, allowNull: false },
    DNI_DESC:     { type: DataTypes.BIGINT, allowNull: true },
    CUIL:         { type: DataTypes.BIGINT, allowNull: true },
    APEYNOM:      { type: DataTypes.STRING, allowNull: false },
    MTO_CUO:      { type: DataTypes.DECIMAL(10,2), allowNull: false },
    cantidad:     { type: DataTypes.INTEGER, allowNull: false },
    FECHA_VTO:    { type: DataTypes.DATE,       allowNull:true},
    
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

export default DebitosTotalesAux;