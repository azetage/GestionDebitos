import { Sequelize } from 'sequelize';
import dotenv  from 'dotenv';
dotenv.config({path: '.env'})


const db_debitos = new Sequelize(
    'Debitos',
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        dialect: 'mssql',
        host: process.env.DB_HOST,
        logging: false,
        timezone: "-03:00"
});


const db_viviendas_fonavi = new Sequelize(
    'Viviendas_Fonavi',
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        dialect: 'mssql',
        host: process.env.DB_HOST,
        logging: false,
        timezone: "-03:00"
    });



    const db_vistaDebitos = new Sequelize(
        'operatorias2',
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            dialect: 'mssql',
            host: process.env.DB_HOST,
            logging: false,
            timezone: "-03:00"
    });    
export {
        db_debitos,
        db_viviendas_fonavi,
        db_vistaDebitos
       }