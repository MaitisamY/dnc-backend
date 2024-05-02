import mysql from 'mysql2/promise';
import { db } from '../config/dbConfig.js'
import bcrypt from 'bcrypt';

export const getUser = async (email, password) => {
    try {
        const connection = await mysql.createConnection(db);

        const sql = `SELECT * FROM users WHERE email = ?`;
        const [result] = await connection.query(sql, [email]);

        // Close the connection
        await connection.end();

        if (result.length === 0) {
            // User with the given email address not found
            return null; 
        }

        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, result[0].password);

        if (!isPasswordValid) {
            // Invalid password
            return null; 
        } else {
            // Password is valid, return user data
            return result; 
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error; // Rethrow the error for handling in the route handler
    }
};
