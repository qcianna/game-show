import fastify from 'fastify';

const app = fastify();

app.get('/', async (request, reply) => {
  return { message: 'Hello from the game-show backend server!' };
});

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Server is running on http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();