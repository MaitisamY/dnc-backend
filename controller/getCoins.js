import mysql from 'mysql2/promise'
import { db } from '../config/dbConfig.js'

export const getCoins = async (user) => {
    try {
        const connection = await mysql.createConnection(db);

        const sql = `SELECT coins FROM coins WHERE user_id = ?`;
        const values = [user];

        const [result] = await connection.query(sql, values);
        const coins = result[0].coins;
         
        await connection.end();
        return coins;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error; // Rethrow the error for handling in the route handler
    }
}