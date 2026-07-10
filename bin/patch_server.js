const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/index.js');
let code = fs.readFileSync(file, 'utf8');

// 1. Comment out express.static for client/dist
code = code.replace(
    `app.use(express.static(path.join(__dirname, '../client/dist')));`,
    `// app.use(express.static(path.join(__dirname, '../client/dist'))); // Handled by Next.js`
);

// 2. Replace the react routing and server start with Next.js prepare
const reactRoutingStr = `// Handle React Routing, return all requests to React app`;
const indexToReplace = code.indexOf(reactRoutingStr);
if (indexToReplace !== -1) {
    code = code.substring(0, indexToReplace) + `
// Next.js Integration
const next = require('next');
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
    // Error Handling Middleware for API
    app.use('/api', (err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

    // Handle React Routing with Next.js
    app.all('*', (req, res) => {
        return handle(req, res);
    });

    // Start Server
    const startServer = async () => {
        try {
            console.log('Firebase connected!');
            server.listen(PORT, '0.0.0.0', () => {
                console.log(\`> Next.js + Express server running on port \${PORT} (0.0.0.0)\`);
            });
        } catch (error) {
            console.error('Unable to start the server:', error);
        }
    };

    if (require.main === module) {
        startServer();
    }
});

module.exports = app;
`;
}
fs.writeFileSync(file, code);
console.log('Patch applied.');
