import {db_debitos } from "../config/db.js";
import {DataTypes} from 'sequelize'

const EnvioDebitos = db_debitos.define('VISTA_ENVIODEBITOS',{
    COD:                    {       type: DataTypes.STRING,     allowNull:false},
    COD_DEB:                {       type: DataTypes.INTEGER,     allowNull:false},
    SUCURSAL:               {       type: DataTypes.STRING,     allowNull:false},
    NRO_AGENTE:             {       type: DataTypes.BIGINT,     allowNull:false},
    APEYNOM:                {       type: DataTypes.STRING,     allowNull:false},
    DNI_DESC:               {       type: DataTypes.BIGINT,     allowNull:false,primaryKey: true  ,autoIncrement: false },
    TAREA:                  {       type: DataTypes.STRING,     allowNull:false},
    MTO_TOTAL:              {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    PLAZO:                  {       type: DataTypes.STRING,     allowNull:false},
    MTO_CUO:                {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    DESC_PT:                {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    MTO_ADIC:               {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    MTO_INT:                {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    MTO_DEUDA:              {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    MTO_SEG:                {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    GTS_ADM:                {       type: DataTypes.DECIMAL(10,2), allowNull: false },
    FEC_ENVIO:              {       type: DataTypes.DATE,       allowNull:false},  
    FEC_VTO:                {       type: DataTypes.DATE,       allowNull:false},
    OBSERV:                 {       type: DataTypes.STRING,     allowNull:false},
    CUO_DES:                {       type: DataTypes.STRING,     allowNull:false},
    CUO_HAS:                {       type: DataTypes.STRING,     allowNull:false},
    USUARIO:                {       type: DataTypes.STRING,     allowNull:false},
    FECHA_PROCESO:          {       type: DataTypes.STRING,     allowNull:false},
    EQUIPO:                 {       type: DataTypes.STRING,     allowNull:false},
    NRO:                    {       type: DataTypes.STRING,     allowNull:false},
    CON_DEUDA:              {       type: DataTypes.STRING,     allowNull:false},
    UVI:                    {       type: DataTypes.STRING,     allowNull:false},
    FECHA_UVI:              {       type: DataTypes.DATE,       allowNull:false},
    FECHA_ENVIO_OFFSET:     {       type: DataTypes.DATE,       allowNull:false},
    FECHA_VTO_OFFSET:       {       type: DataTypes.DATE,       allowNull:false},

    },
    {
        timestamps: false,
        freezeTableName: true


    }
)

export default EnvioDebitos;