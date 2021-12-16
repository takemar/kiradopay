/** @type {import('next').NextConfig} */
module.exports = require('next-pwa')({
  pwa: {
    dest: "public",
  },
  reactStrictMode: true,
});
