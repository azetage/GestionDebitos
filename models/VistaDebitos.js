import {db_vistaDebitos } from "../config/db.js";
import {DataTypes} from 'sequelize'

const VistaDebitos = db_vistaDebitos.define('v_debitos',{
    id_cuota:           {       type: DataTypes.STRING,     allowNull:true},
    operatoria:         {       type: DataTypes.STRING,     allowNull:true},
    Creditoid:          {       type: DataTypes.STRING,     allowNull:true},
    cod_deb:            {       type: DataTypes.STRING,     allowNull:true},
    campo_agente:       {       type: DataTypes.STRING,     allowNull:true},
    codigo:             {       type: DataTypes.STRING,     allowNull:true,primaryKey: true  ,autoIncrement: true },
    imp_cuota:          {       type: DataTypes.STRING,     allowNull:true},
    baja_desc:          {       type: DataTypes.STRING,     allowNull:true},
    nro_cuota:          {       type: DataTypes.STRING,     allowNull:true},
    organismo:          {       type: DataTypes.STRING,     allowNull:true},
    OrganismoId:        {       type: DataTypes.STRING,     allowNull:true},
    sigla:              {       type: DataTypes.STRING,     allowNull:true},
    cuenta:             {       type: DataTypes.STRING,     allowNull:true},
    fecha:              {       type: DataTypes.DATE,     allowNull:true},
    periodo:            {       type: DataTypes.STRING,     allowNull:true},
    titular:            {       type: DataTypes.STRING,     allowNull:true},
    dni_titular:        {       type: DataTypes.STRING,     allowNull:true},  
    nombre:             {       type: DataTypes.STRING,     allowNull:true},
    dni:                {       type: DataTypes.STRING,     allowNull:true},
    agente:             {       type: DataTypes.STRING,     allowNull:true},
    agente_debito:      {       type: DataTypes.STRING,     allowNull:true},
    },
    {
        timestamps: false,
        freezeTableName: true


    }
)

export default VistaDebitos;