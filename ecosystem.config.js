module.exports = {
  apps: [
    {
      name: "skyline-portal",
      cwd: "d:\\SSM\\skyline-survey",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2000M",
      env: {
        PORT: 3000
      }
    }
  ]
};
