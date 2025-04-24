// Script para iniciar el servidor MCP de Supabase
const { spawn } = require('child_process');
const fs = require('fs');

console.log('Iniciando servidor MCP para Supabase...');

// Configuración
const PAT = 'sbp_1ded08ee98a7017c0b62b0b975f20353aec5047d';

// Iniciar el servidor
const server = spawn('npx', [
  '-y',
  '@supabase/mcp-server-supabase@latest',
  '--access-token',
  PAT
]);

// Manejar salida del servidor
server.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`STDERR: ${data}`);
});

server.on('close', (code) => {
  console.log(`El servidor se cerró con código ${code}`);
});

// Guardar el PID para poder matar el proceso después
fs.writeFileSync('mcp-server.pid', server.pid.toString());

console.log(`Servidor MCP iniciado con PID ${server.pid}`);
console.log(`Escuchando en http://localhost:3100 (puerto predeterminado)`); 