import mysql from 'mysql2/promise';
import { db } from '../config/dbConfig.js'
import bcrypt from 'bcrypt';

export const addUser = async (name, email, phone, password) => {
    try {
        const connection = await mysql.createConnection(db);

        const check = `SELECT * FROM users WHERE email = ?`;
        const values = [email];

        const [result] = await connection.query(check, values);

        if (result.length > 0) {
            return null;
        } else {

            const hashedPassword = await bcrypt.hash(password, 10);

            const sql = `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`;
            const values = [name, email, phone, hashedPassword];

            const [result] = await connection.query(sql, values);

            // Close the connection
            await connection.end();

            return result;
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error; // Rethrow the error for handling in the route handler
    }
}