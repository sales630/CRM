const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = {
  // Images
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  // Documents
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  // Archives
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /api/upload — receive base64 file, save to disk
router.post("/", (req, res) => {
  try {
    const { fileName, fileType, fileData, fileSize } = req.body;

    if (!fileName || !fileType || !fileData) {
      return res
        .status(400)
        .json({ success: false, error: "fileName, fileType and fileData are required" });
    }

    // Validate file size
    const estimatedSize = fileSize || Math.ceil((fileData.length * 3) / 4);
    if (estimatedSize > MAX_SIZE_BYTES) {
      return res.status(400).json({ success: false, error: "File exceeds maximum size of 10MB" });
    }

    // Validate file type
    if (!ALLOWED_TYPES[fileType]) {
      return res
        .status(400)
        .json({ success: false, error: `File type "${fileType}" is not allowed` });
    }

    // Strip base64 prefix if present (e.g. "data:image/png;base64,...")
    const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;

    // Generate unique filename
    const ext = ALLOWED_TYPES[fileType] || "bin";
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    // Write file to disk
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);

    // Return accessible URL
    const fileUrl = `/uploads/${uniqueName}`;
    const originalName = fileName;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: originalName,
        fileType,
        fileSize: buffer.length,
        uniqueName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/upload/list — list uploaded files (admin use)
router.get("/list", (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).map((name) => {
      const stat = fs.statSync(path.join(UPLOADS_DIR, name));
      return { name, size: stat.size, created: stat.birthtime };
    });
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
