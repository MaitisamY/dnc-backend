import { db } from '../config/dbConnection.js'

export const getUser = async (email, password) => {
    try {
        const sql = `SELECT * FROM users WHERE email = ? AND password = ?`
        const values = [email, password]

        const [result] = await db.query(sql, values)
        
        // Check if any rows were returned
        if (result.length === 0) {
            return { status: 404, message: 'Username or password is incorrect' }
        } else {
            return { status: 200, data: result.rows, message: 'Success' }
        }
    } catch (error) {
        console.error('Error executing query:', error);
        return { status: 500, message: 'Internal server error' }
    }
}
