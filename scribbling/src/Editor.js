import { useCallback, useEffect, useState } from 'react';
import Quill from 'quill';
import "quill/dist/quill.snow.css";
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

// Set interval for update
const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["image", "blockquote", "code-block", "link"],
    ["clean"]
];

export default function Editor() {
    const {id: documentId } = useParams();
    /* To allow the socket to be accessed anywhere */
    const [socket, setSocket] = useState();
    const [quill, setQuill] = useState();

    // Creates a connection to the server
    useEffect(() => {
        const s = io("http://localhost:3001");
        setSocket(s);

        return () => {
            s.disconnect();
        };
    }, []);

    
    useEffect(() => {
        if (socket == null || quill == null) return;
        
        /*Disable the editor until the document is loaded */
        socket.once("load-document", document => {
            quill.setContents(document);
            quill.enable();
        });
        
        // Informs the document being worked on, to the server
        socket.emit('get-document', documentId);
    }, [socket, quill, documentId]);
    
    useEffect(() => {
        if (socket == null || quill == null) return;

        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents());
        }, SAVE_INTERVAL_MS); // Create SAVE_INTERVAL_MS variable

        return () => {
            clearInterval(interval);
        };
    }, [socket, quill]);
    
    
    useEffect(() => {
        if (socket == null || quill == null) return;
        const handler = (delta) => {
            /* Update the document to 
            have the changes from client.
            
            This allows real-time changes to propogate 
            to different instances of the editor.
            */
            quill.updateContents(delta);
        };
        socket.on("receive-changes", handler);
        
        return () => {
            socket.off("receive-changes", handler);
        };
    }, [socket, quill]);

    /* 
    This prevents other people from altering the main user's changes.
    A different source will record those people's changes instead.
    */
    useEffect(() => {
        if (socket == null || quill == null) return;
        const handler = (delta, oldDelta, source) => {
            if (source !== 'user') return;
            socket.emit("send-changes", delta);
        }
        quill.on('text-change', handler);
        
        return () => {
            quill.off('text-change', handler);
        };
    }, [socket, quill]);

    const wrapperRef = useCallback(wrapper => {
        if (wrapper == null) return;

        wrapper.innerHTML = "";
        const editor = document.createElement('div');
        wrapper.append(editor);
        const q = new Quill(editor, { theme: 'snow', 
        modules: { 
            //cursors: true, 
            toolbar: TOOLBAR_OPTIONS, 
            // To confine undo of changes to each user
            //history: { userOnly: true }
        }  });
        q.disable();
        q.setText("Loading...");
        setQuill(q);
    }, []);
    return (
        <div className="container" ref={wrapperRef}></div>
    );
}
