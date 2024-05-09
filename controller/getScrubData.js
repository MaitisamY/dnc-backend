import mysql from 'mysql2/promise'
import { db } from '../config/dbConfig.js'

export const getScrubData = async () => {
    try {
        const connection = await mysql.createConnection(db);

        const sql = `SELECT * FROM scrub_records WHERE user_id = 1 ORDER BY id DESC`;

        const [result] = await connection.query(sql);
         
        await connection.end();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error; // Rethrow the error for handling in the route handler
    }
}