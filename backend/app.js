// Startup shim for cPanel Application Manager (Phusion Passenger).
// Passenger looks for app.js in the application root; the real entry point is src/server.js.
import './src/server.js';
