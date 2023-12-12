const NotesHandler = require('./handler');
const routes = require('./routes');

// Menggunakan Router dan Handler pada Plugin Notes
module.exports = {
  name: 'notes',
  version: '1.0.0',
  register: async (server, { service }) => {
    const notesHandler = new NotesHandler(service);
    server.route(routes(notesHandler));
  },
};
