const spawn = require('child_process').spawn;

function promisifySpawn(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args);
        let stderr = '';

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                const error = new Error(`Process exited with code ${code}`);
                error.stderr = stderr;
                reject(error);
            } else {
                resolve();
            }
        });
    });

}
module.exports = { promisifySpawn };