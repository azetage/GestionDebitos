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


export {
        db_debitos,
       }