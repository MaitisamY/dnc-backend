import fs from 'fs'

const writeCSV = async (filePath, data) => {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        
        writer.on('error', reject);

        writer.on('open', () => {
            if (data.length === 0) {
                writer.end();
                resolve();
                return;
            }
            
            // Write headers
            const headers = Object.keys(data[0]).join(','); // Assuming all rows have the same structure
            writer.write(`${headers}\n`);
            
            // Write data for matching and non-matching records
            data.forEach(row => {
                // Initialize status for the current row
                let status = '';
                
                // Logic to check options and add them to the status
                if (row.TCPA === true) { status += 'TCPA, '; }
                if (row.DNCComplainers === true) { status += 'DNC Complainers, '; }
                if (row.FederalDNC === true) { status += 'Federal DNC, '; }

                // Remove the last comma and space from the status string
                if (status.length > 0) {
                    status = status.slice(0, -2);
                }

                // Remove the properties used for status from the row object
                delete row.TCPA;
                delete row.DNCComplainers;
                delete row.FederalDNC;

                // Write the row data along with the status
                const values = Object.values(row).join(',');
                writer.write(`${values},${status}\n`);
            });
            
            writer.end();
        });

        writer.on('finish', resolve);
    });
}

export { writeCSV }