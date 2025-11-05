# 📊 Monthly Agent Premiums Report

Una aplicación web moderna para generar reportes de primas mensuales de agentes con funcionalidades avanzadas de exportación y análisis.

## ✨ Características Principales

- **📤 Upload de CSV**: Drag & drop de archivos CSV con validación automática
- **🔍 Filtros Avanzados**: Por mes, agentes, productos y búsqueda de texto
- **📊 Tabla Interactiva**: Visualización de datos con colores por producto
- **📱 Responsive Design**: Optimizado para dispositivos móviles y desktop
- **🌙 Modo Oscuro**: Tema oscuro elegante con fondo negro y bordes #555555
- **🌍 Internacionalización**: Soporte para inglés y español
- **📸 Screenshots**: Generación de capturas de pantalla con títulos y subtítulos
- **📄 PDF Export**: Reportes en PDF con opciones de ordenamiento y límite de registros
- **⚡ PWA Ready**: Funcionalidades de Progressive Web App

## 🚀 Tecnologías Utilizadas

- **Frontend**: Next.js 13.5.1, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **PDF**: jsPDF, jspdf-autotable
- **Screenshots**: html2canvas
- **CSV**: PapaParse
- **Themes**: next-themes
- **Build**: Webpack, ESLint

## 📋 Requisitos del Sistema

- Node.js 18+ 
- npm 9+
- Navegador moderno con soporte para ES6+

## 🛠️ Instalación

1. **Instalar el proyecto**
   ```bash
   cd gi-reportes
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

4. **Construir para producción**
   ```bash
   npm run build
   npm start
   ```

## 📁 Estructura del Proyecto

```
monthly-premiums-report/
├── app/                    # App Router de Next.js
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página principal
├── components/             # Componentes reutilizables
│   ├── ui/                # Componentes de UI base
│   ├── theme-toggle.tsx   # Toggle de tema
│   └── theme-provider.tsx # Proveedor de tema
├── hooks/                  # Hooks personalizados
│   ├── use-toast.ts       # Hook para notificaciones
│   └── use-translations.ts # Hook para i18n
├── lib/                    # Utilidades y helpers
│   ├── csv-utils.ts       # Procesamiento de CSV
│   ├── pdf-utils.ts       # Generación de PDF
│   ├── translations.ts     # Traducciones
│   └── utils.ts           # Utilidades generales
├── public/                 # Archivos estáticos
│   ├── manifest.json      # PWA manifest
│   └── sw.js             # Service Worker
└── package.json           # Dependencias y scripts
```

## 📊 Formato del CSV

El archivo CSV debe contener las siguientes columnas:

```csv
Submit Date,Writing Agent Last Name,Writing Agent First Name,Product,Premium Amount
8/22/2025,HERNANDEZ COLMENARES,HECTOR,Health Plan A,$49.57
```

## 🎨 Personalización

### Colores de Productos
Los productos se asignan automáticamente a colores diferentes para mejor visualización:
- Azul, Verde, Púrpura, Rosa, Índigo, Amarillo, Rojo, Teal, Naranja, Cian

### Temas
- **Modo Claro**: Fondo blanco con bordes grises
- **Modo Oscuro**: Fondo negro (#000000) con elementos #333333

## 📱 Funcionalidades PWA

- **Instalación**: Se puede instalar como aplicación nativa
- **Offline**: Funcionalidad básica sin conexión
- **Responsive**: Adaptado a todos los tamaños de pantalla

## 🌐 Despliegue

### Vercel (Recomendado)
1. Subir el proyecto
2. Configurar variables de entorno si es necesario
3. Desplegar automáticamente

### Netlify
1. Subir el proyecto
2. Build command: `npm run build`
3. Publish directory: `out`

### Otros
- **Railway**: Soporte nativo para Next.js
- **Render**: Despliegue automático
- **Heroku**: Requiere configuración adicional

## 🔧 Scripts Disponibles

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
2. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
3. Contacta al equipo de desarrollo

## 📞 Soporte

Si tienes preguntas o necesitas ayuda:
- Contacta al equipo de desarrollo

## 🎯 Roadmap

- [ ] Exportación a Excel
- [ ] Gráficos y estadísticas
- [ ] API REST
- [ ] Base de datos persistente
- [ ] Autenticación de usuarios
- [ ] Múltiples formatos de exportación

---

**Desarrollado con ❤️ usando Next.js y TypeScript**
# g-reportes
