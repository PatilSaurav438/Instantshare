// server.js

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
// require('dotenv').config(); // Uncomment this line in a real environment

// ==========================================================
// 1. New: Code Generator Function
// ==========================================================
function generateRandomCode() {
    // 10000 से 99999 तक 5 अंकों का कोड जनरेट करता है
    return Math.floor(10000 + Math.random() * 90000).toString();
}

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
// ==========================================================
// 2. Updated: /upload Route
// ==========================================================
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded.' });
    }

    // --- नया कोड यहाँ ---
    const accessCode = generateRandomCode(); // नया कोड जनरेट करें

    // फ़ाइल नाम और कोड को एक साथ स्टोर करें ताकि इसे ट्रैक किया जा सके
    fileStorage[accessCode] = req.file.filename;

    // 10 मिनट बाद हटाने का टाइमर सेट करें
    setTimeout(() => {
        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${req.file.filename}`);
        }
        delete fileStorage[accessCode]; // स्टोरेज से कोड हटाएं
    }, 10 * 60 * 1000); // 10 minutes
    // -------------------

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // जवाब में कोड भी भेजें
    res.json({ 
        url: imageUrl,
        code: accessCode, // कोड यहाँ जोड़ा गया है
        expiry: 10 // minutes
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

// ==========================================================
// 3. New: /code Route
// ==========================================================
app.get('/code/:code', (req, res) => {
    const code = req.params.code;
    const filename = fileStorage[code];

    if (!filename) {
        return res.status(404).json({ error: 'Code not found or expired.' });
    }

    // इमेज URL वापस भेजें
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    res.json({ url: imageUrl });
});

// 6. Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
