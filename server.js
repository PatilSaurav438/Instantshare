// server.js (सही किया गया और अंतिम संस्करण)

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
// require('dotenv').config(); // Uncomment this line in a real environment

// ==========================================================
// 1. Storage Map & Code Generator
// ==========================================================
// एक ऑब्जेक्ट जहाँ हम कोड को फ़ाइलनाम के साथ स्टोर करेंगे
const fileStorage = {}; 

function generateRandomCode() {
    // 10000 से 99999 तक 5 अंकों का कोड जनरेट करता है
    return Math.floor(10000 + Math.random() * 90000).toString();
}

const app = express();
const PORT = process.env.PORT || 3000; 
const UPLOAD_FOLDER = 'uploads';
const DELETE_TIME_MINUTES = 10; 

// Middleware Setup
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024 
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files (JPG, PNG, GIF) are allowed!'), false);
        }
        cb(null, true);
    }
}).single('imageFile'); // **IMPORTANT**: Field name is 'imageFile'

// 3. Auto-Deletion (पुराने Scheduler को हटाया गया, अब केवल setTimeout का उपयोग करेंगे)

// ==========================================================
// 4. API Route: Image Upload (Updated)
// ==========================================================
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: err.message, success: false });
        } else if (err) {
            return res.status(500).json({ message: err.message, success: false });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No image uploaded.', success: false });
        }

        const accessCode = generateRandomCode(); 
        
        // फ़ाइल नाम और कोड को एक साथ स्टोर करें 
        fileStorage[accessCode] = req.file.filename;

        // 10 मिनट बाद हटाने का टाइमर सेट करें
        setTimeout(() => {
            const filePath = path.join(__dirname, 'uploads', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (error) => {
                    if (error) console.error(`Error deleting file ${req.file.filename}:`, error);
                    else console.log(`Successfully deleted file: ${req.file.filename}`);
                });
            }
            delete fileStorage[accessCode]; 
        }, DELETE_TIME_MINUTES * 60 * 1000); 

        // जवाब में URL और कोड भेजें
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ 
            url: imageUrl,
            code: accessCode, 
            expiry: DELETE_TIME_MINUTES,
            success: true
        });
    });
});

// ==========================================================
// 5. API Route: Serve Image (View)
// ==========================================================
app.get('/uploads/:fileId', (req, res) => { // URL को /uploads/fileId किया गया
    const filePath = path.join(__dirname, UPLOAD_FOLDER, req.params.fileId);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Image not found or link has expired (auto-deleted).');
    }
});

// ==========================================================
// 6. API Route: /code Access
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


// 7. Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
