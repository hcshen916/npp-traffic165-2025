module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'mysql',
        host: env('DATABASE_HOST', 'mysql'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', env('CMS_DATABASE_NAME', env('MYSQL_DATABASE', 'roadsafe_cms'))),
        username: env('DATABASE_USERNAME', env('MYSQL_USER', 'npptraffic165')),
        password: env('DATABASE_PASSWORD', env('MYSQL_PASSWORD', 'changeme')),
        ssl: env.bool('DATABASE_SSL', false),
      },
      options: {}
    },
  },
});
