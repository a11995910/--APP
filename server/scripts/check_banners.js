const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkBanners() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Wangjun@123',
            database: 'loan_reminder'
        });

        console.log('Connected to database');

        const [rows] = await connection.execute('SELECT * FROM banners ORDER BY created_at DESC');
        console.log('Total banners:', rows.length);
        console.log('Latest banners:');
        rows.slice(0, 5).forEach(row => {
            console.log(JSON.stringify(row, null, 2));
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkBanners();
