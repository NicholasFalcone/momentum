# One Moment

A sleek and modern application launcher.

## Development

To start the application in development mode:

```bash
npm install
npm start
```

This will concurrently run the Vite dev server and the Electron application.

## Build and Distribution

To build the application for production and create an installer:

```bash
npm run dist
```

The output will be located in the `release/` directory.

## Launch at Startup

The installed Windows build can be configured to start automatically when you sign in.

Open the app settings and enable `Launch at Windows startup`.

This option is only available in the packaged app. It will not register correctly while running through `npm start`.

### Build Troubleshooting

If you encounter TypeScript errors related to `minimatch` (TS2688), ensure you have the correct type definitions installed:

```bash
npm install --save-dev @types/minimatch@5.1.2
```

## Technologies

- **Frontend**: React, Vite, Framer Motion, Lucide React
- **Engine**: Electron
- **Language**: TypeScript / JavaScript
