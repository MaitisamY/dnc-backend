import mysql from 'mysql2/promise'
import { db } from '../config/dbConfig.js'

export const getScrubData = async (user) => {
    try {
        const connection = await mysql.createConnection(db);

        const sql = `SELECT * FROM scrub_records WHERE user_id = ? ORDER BY id DESC`;
        const values = [user];

        const [result] = await connection.query(sql, values);
         
        await connection.end();
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error; // Rethrow the error for handling in the route handler
    }
}