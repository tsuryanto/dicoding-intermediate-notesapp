// mengimpor dotenv dan menjalankan konfigurasinya
require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

// notes
const notes = require('./api/notes');
const NotesService = require('./services/postgres/NotesService');
const NotesValidator = require('./validator/notes');

// users
const users = require('./api/users');
const UsersService = require('./services/postgres/UsersService');
const UsersValidator = require('./validator/users');

// authentications
const authentications = require('./api/authentications');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const TokenManager = require('./tokenize/TokenManager');
const AuthenticationsValidator = require('./validator/authentications');

const ClientError = require('./exceptions/ClientError');

const init = async () => {
  const notesService = new NotesService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // registrasi plugin eksternal
  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  // mendefinisikan strategy autentikasi jwt

  // 'notesapp_jwt' = strategy name akan digunakan untuk menetapkan authentication pada routes.
  // 'jwt' = nama skema yang akan digunakan pada pembuatan strategy
  //         di sini kita memberikan nilai ‘jwt’ untuk menggunakan strategi jwt dari @hapi/jwt.
  server.auth.strategy('notesapp_jwt', 'jwt', {

    // merupakan key atau kunci dari token JWT-nya (di mana merupakan access token key)
    keys: process.env.ACCESS_TOKEN_KEY,

    // merupakan objek yang menentukan seperti apa signature token JWT harus diverifikasi.
    // nilai false di value dari object verify berarti tidak akan di verifikasi
    verify: {
      // nilai audience dari token
      aud: false,
      // nilai issuer dari token
      iss: false,
      // nilai subject dari token,
      sub: false,
      // nilai number yang menentukan umur kedaluwarsa dari token
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },

    // merupakan fungsi yang membawa artifacts token.
    // Fungsi ini dapat kita manfaatkan untuk menyimpan payload token
    // yang berarti kredensial pengguna pada request.auth
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: notes,
      options: {
        service: notesService,
        validator: NotesValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
  ]);

  server.ext('onPreResponse', (request, h) => {
    // mendapatkan konteks response dari request
    const { response } = request;

    // penanganan client error secara internal.
    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
