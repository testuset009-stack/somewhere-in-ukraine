// vite build config for workspace tooling
// keeps file watch off when disabled by env
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(function () {
return {
plugins: [react(), tailwindcss()],
resolve: {
alias: {
'@': path.resolve(__dirname, '.')
}
},
server: {
hmr: process.env.DISABLE_HMR !== 'true',
watch:
process.env.DISABLE_HMR === 'true'
? null
: {}
}
};
});
