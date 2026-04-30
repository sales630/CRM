/* eslint-disable */
import { useRef, useState } from "react";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { uploadFile, FILE_BASE_URL } from "services/api";

const MAX_SIZE_MB = 10;

const FILE_ICON = {
  "image":       "image",
  "pdf":         "picture_as_pdf",
  "word":        "description",
  "excel":       "table_chart",
  "powerpoint":  "slideshow",
  "text":        "article",
  "csv":         "grid_on",
  "zip":         "folder_zip",
  "default":     "attach_file",
};

function getFileIcon(type = "") {
  if (type.startsWith("image/"))    return FILE_ICON.image;
  if (type.includes("pdf"))         return FILE_ICON.pdf;
  if (type.includes("word") || type.includes("document")) return FILE_ICON.word;
  if (type.includes("excel") || type.includes("sheet"))   return FILE_ICON.excel;
  if (type.includes("powerpoint") || type.includes("presentation")) return FILE_ICON.powerpoint;
  if (type.includes("csv"))         return FILE_ICON.csv;
  if (type.includes("zip") || type.includes("rar")) return FILE_ICON.zip;
  if (type.startsWith("text/"))     return FILE_ICON.text;
  return FILE_ICON.default;
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Single attachment chip (shows after upload)
export function AttachmentChip({ attachment, onRemove, size = "medium" }) {
  const isImage = attachment.fileType?.startsWith("image/");
  const url = attachment.url?.startsWith("http") ? attachment.url : `${FILE_BASE_URL}${attachment.url}`;

  return (
    <MDBox
      display="inline-flex"
      alignItems="center"
      gap={0.8}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        px: 1,
        py: 0.5,
        bgcolor: "rgba(0,0,0,0.03)",
        maxWidth: 200,
        cursor: "pointer",
        "&:hover": { bgcolor: "rgba(0,0,0,0.06)" },
      }}
      onClick={() => window.open(url, "_blank")}
    >
      {isImage ? (
        <MDBox
          component="img"
          src={url}
          alt={attachment.fileName}
          sx={{ width: 28, height: 28, borderRadius: 1, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <Icon sx={{ fontSize: 20, color: "text.secondary", flexShrink: 0 }}>
          {getFileIcon(attachment.fileType)}
        </Icon>
      )}
      <MDBox sx={{ overflow: "hidden", flex: 1 }}>
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}
        >
          {attachment.fileName}
        </MDTypography>
        {attachment.fileSize && (
          <MDTypography variant="caption" color="text" sx={{ fontSize: "10px" }}>
            {formatSize(attachment.fileSize)}
          </MDTypography>
        )}
      </MDBox>
      {onRemove && (
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onRemove(attachment); }}
          sx={{ p: 0.2, flexShrink: 0 }}
        >
          <Icon sx={{ fontSize: 14 }}>close</Icon>
        </IconButton>
      )}
    </MDBox>
  );
}

// Main hook: useFileAttachment
export function useFileAttachment() {
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const openPicker = () => {
    setError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    for (const file of files) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" is too large. Max size is ${MAX_SIZE_MB}MB.`);
        continue;
      }
      setUploading(true);
      setUploadProgress(0);
      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(p => Math.min(p + 15, 85));
        }, 100);

        const result = await uploadFile(file);
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 500);

        setAttachments(prev => [...prev, result]);
        setError("");
      } catch (err) {
        setError(err.message || "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  const removeAttachment = (attachment) => {
    setAttachments(prev => prev.filter(a => a.url !== attachment.url));
  };

  const clearAttachments = () => setAttachments([]);

  const FileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
      style={{ display: "none" }}
      onChange={handleFileChange}
    />
  );

  return {
    attachments,
    uploading,
    uploadProgress,
    error,
    openPicker,
    removeAttachment,
    clearAttachments,
    FileInput,
    setError,
  };
}

// AttachButton: icon button that triggers picker
export function AttachButton({ onOpen, uploading, iconColor, tooltip = "Attach file", size = "small" }) {
  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton size={size} onClick={onOpen} disabled={uploading}>
          {uploading
            ? <CircularProgress size={18} color="inherit" />
            : <Icon sx={{ color: iconColor || "text.secondary" }}>attach_file</Icon>
          }
        </IconButton>
      </span>
    </Tooltip>
  );
}

// AttachmentPreviewBar: shows pending attachments with progress
export function AttachmentPreviewBar({ attachments, uploading, uploadProgress, error, onRemove, onClear }) {
  if (!attachments.length && !uploading && !error) return null;

  return (
    <MDBox sx={{ px: 1, pb: 0.5 }}>
      {error && (
        <MDTypography variant="caption" color="error" display="block" sx={{ mb: 0.5 }}>
          <Icon sx={{ fontSize: 14, mr: 0.3, verticalAlign: "middle" }}>error_outline</Icon>
          {error}
        </MDTypography>
      )}
      {uploading && (
        <MDBox mb={0.5}>
          <MDTypography variant="caption" color="text">Uploading...</MDTypography>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.3, height: 4, borderRadius: 2 }} />
        </MDBox>
      )}
      {attachments.length > 0 && (
        <MDBox display="flex" flexWrap="wrap" gap={0.8} alignItems="center">
          {attachments.map((att, i) => (
            <AttachmentChip key={i} attachment={att} onRemove={onRemove} />
          ))}
          {onClear && (
            <Tooltip title="Remove all attachments">
              <IconButton size="small" onClick={onClear}>
                <Icon sx={{ fontSize: 16 }}>delete_sweep</Icon>
              </IconButton>
            </Tooltip>
          )}
        </MDBox>
      )}
    </MDBox>
  );
}

export default { useFileAttachment, AttachButton, AttachmentPreviewBar, AttachmentChip };
