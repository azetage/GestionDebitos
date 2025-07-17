import {db_debitos } from "../config/db.js";
import {DataTypes} from 'sequelize'

const EnvioPlanes = db_debitos.define('VISTA_ENVIOPLANES',{
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
    CONF_PLAN_OFFSET:       {       type: DataTypes.DATE,       allowNull:false},
    VTO_PLAN_OFFSET:        {       type: DataTypes.DATE,       allowNull:false},
    },
    {
        timestamps: false,
        freezeTableName: true

    }
)

export default EnvioPlanes;