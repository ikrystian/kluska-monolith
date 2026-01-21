const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');

fs.readdir(modelsDir, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    files.forEach(file => {
        if (!file.endsWith('.ts')) return;

        const filePath = path.join(modelsDir, file);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', filePath, err);
                return;
            }

            let newData = data;

            // Fix 1: Cast ret to any for id assignment
            newData = newData.replace(/ret\.id = ret\._id\.toString\(\);/g, '(ret as any).id = ret._id.toString();');

            // Fix 2: Cast ret to any for __v deletion
            newData = newData.replace(/delete ret\.__v;/g, 'delete (ret as any).__v;');

            // Fix 3: Omit _id from Document extension to allow re-declaration as string
            // Match: export interface IName extends Document {
            newData = newData.replace(/export interface I(\w+) extends Document {/g, 'export interface I$1 extends Omit<Document, \'_id\'> {');

            if (newData !== data) {
                fs.writeFile(filePath, newData, 'utf8', (err) => {
                    if (err) {
                        console.error('Error writing file:', filePath, err);
                    } else {
                        console.log('Fixed:', file);
                    }
                });
            }
        });
    });
});
