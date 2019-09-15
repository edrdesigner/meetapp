module.exports = {
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'docker',
  database: 'meetapp',
  define: {
    timestamp: true,
    underscored: true,
    underscoredAll: true,
  },
};
