import ngrok from 'ngrok';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const updateEnvFile = (filePath, key, value) => {
    let envFileContent = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envFileContent)) {
        envFileContent = envFileContent.replace(regex, `${key}=${value}`);
    } else {
        envFileContent += `\n${key}=${value}`;
    }
    fs.writeFileSync(filePath, envFileContent);
};

const setupNgrok = async () => {
    try {
        const envPath = path.join(__dirname, '.env');
        await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
        const url = await ngrok.connect({
            addr: process.env.PORT || 8080,
            onStatusChange: status => console.log('Ngrok status:', status),
            onLogEvent: data => console.log('Ngrok log:', data),
        });
        updateEnvFile(envPath, 'WEBHOOK_URL', url);
        process.env.WEBHOOK_URL = url;
    } catch (err) {
        console.error('Erreur lors de la mise à jour de l\'URL Ngrok:', err);
    }
};

export default setupNgrok;
