// server.js

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
// require('dotenv').config(); // Uncomment this line in a real environment

const app = express();
// IMPORTANT: Use process.env.PORT for deployment (e.g., on Render)
const PORT = process.env.PORT || 3000; 
const UPLOAD_FOLDER = 'uploads';
const DELETE_TIME_MINUTES = 10; // Files will be deleted after 10 minutes

// 1. Middleware Setup
app.use(cors());
app.use(express.json());

// Ensure the upload folder exists
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}

// 2. Multer Configuration (Storage and Validation)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        // Filename: 'imageFile-unixTimestamp.ext'
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB file size limit
    },
    fileFilter: (req, file, cb) => {
        // File type check (images only)
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files (JPG, PNG, GIF) are allowed!'), false);
        }
        cb(null, true);
    }
}).single('imageFile'); // Matches the field name in script.js

// 3. Auto-Deletion Scheduler
function scheduleDeletion(filePath, fileId) {
    const deleteTime = new Date(Date.now() + DELETE_TIME_MINUTES * 60 * 1000);
    
    console.log(`Scheduling deletion for file ${fileId} at ${deleteTime.toLocaleTimeString()}`);

    schedule.scheduleJob(deleteTime, () => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${fileId}:`, err);
            } else {
                console.log(`Successfully deleted file: ${fileId}`);
            }
        });
    });
}

// 4. API Route: Image Upload
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        // Success: Create the shareable link
        // IMPORTANT: In production, req.hostname will be your Render URL.
        const host = req.hostname === 'localhost' ? `http://localhost:${PORT}` : `https://${req.hostname}`;
        const fileId = req.file.filename;
        const shareLink = `${host}/view/${fileId}`; 

        // Schedule file deletion
        const filePath = path.join(UPLOAD_FOLDER, fileId);
        scheduleDeletion(filePath, fileId);

        // Send the link back to the client
        res.status(200).json({ 
            success: true, 
            message: 'File uploaded successfully.', 
            shareLink: shareLink
        });
    });
});

// 5. API Route: Serve Image (View)
// This serves the files from the 'uploads' folder
app.get('/view/:fileId', (req, res) => {
    const filePath = path.join(__dirname, UPLOAD_FOLDER, req.params.fileId);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Image not found or link has expired (auto-deleted).');
    }
});


// 6. Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
