const {Server} = require("socket.io");

let io;

module.exports = {
    init: httpServer => {
        io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                allowedHeaders: ["Content-Type", "Authorization"],
                credentials: true
            }
        });
        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!')
        }
        return io;
    }
}