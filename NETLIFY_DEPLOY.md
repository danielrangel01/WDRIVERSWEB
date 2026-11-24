# Netlify requiere que establezcas VITE_API_URL como variable de entorno en el Dashboard:
# - Ir a Site settings → Environment variables
# - Agregar: VITE_API_URL = https://tu-backend-en-railway.up.railway.app
#
# Despliegue manual CLI (desde la carpeta client/):
#   1. npm install
#   2. npm install --global netlify-cli
#   3. netlify login
#   4. netlify init  (seguir pasos, vincular repo o crear sitio sin CI)
#   5. netlify build --context production  (prueba build)
#   6. netlify deploy --prod  (publica)
#
# O configura Git-Based Deploy: vincula el repo y Netlify detecta este toml automáticamente.

VITE_API_URL=http://localhost:4000
