import {db_viviendas_fonavi } from "../config/db.js";
import {DataTypes} from 'sequelize'

const EnvioPlanes = db_viviendas_fonavi.define('ENVIO_PLANES',{
    COD:           {       type: DataTypes.STRING,     allowNull:false},
    COD_DEB:       {       type: DataTypes.STRING,     allowNull:false},
    N_TARJETA:     {       type: DataTypes.STRING,     allowNull:false},
    APEYNOM:       {       type: DataTypes.STRING,     allowNull:false},
    DNI_DESC:      {       type: DataTypes.STRING,     allowNull:false,primaryKey: true  ,autoIncrement: false },
    MTO_CUO:       {       type: DataTypes.STRING,     allowNull:false},
    MTO_ADIC:      {       type: DataTypes.STRING,     allowNull:false},
    INT_CUO:       {       type: DataTypes.STRING,     allowNull:false},
    CONF_PLAN:     {       type: DataTypes.DATE,       allowNull:false},  
    VTO_PLAN:      {       type: DataTypes.DATE,       allowNull:false},
    TIPO_PLAN:     {       type: DataTypes.STRING,     allowNull:false},  
    },
    {
        timestamps: false,
        freezeTableName: true

    }
)

export default EnvioPlanes;