const mongoose = require("mongoose");
const Document = require("./Document");

mongoose.connect('mongodb://localhost/scribbling', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

const io = require("socket.io")(3001, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const defaultValue = "";

/* Socket allows us to connect back to our client (scribbling) */

io.on("connection", socket => {
    socket.on("get-document", async documentId => {
        const document = await findOrCreateDocument(documentId);
        /*.join call, places the client into their own room,
        according to the documentId */
        socket.join(documentId);
        socket.emit("load-document", document.data);
        
        /*Emits the changes .to the documentId */
        socket.on("send-changes", delta => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        });
        
        socket.on("save-document", async data => {
            await Document.findByIdAndUpdate(documentId, { data });
        });
    });
});

async function findOrCreateDocument(id) {
    if (id == null) return;

    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, data: defaultValue })
    .catch(console.error(error));
}