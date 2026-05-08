const serverExport = require('./server');
console.log('Keys in server.js:', Object.keys(serverExport));
if (serverExport.io) {
  console.log('io is DEFINED');
} else {
  console.log('io is UNDEFINED');
}
