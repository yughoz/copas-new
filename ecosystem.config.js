module.exports = {
  apps: [{
    name: 'copas-app',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production',
      PORT: 3010,
      HOSTNAME: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3010,
      HOSTNAME: '0.0.0.0'
    }
  }]
}