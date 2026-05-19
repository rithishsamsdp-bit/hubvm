// components/chat/FileUploadButton.jsx
// Handles image / audio / file uploads → posts to /chat/upload → returns S3 key

import { useRef, useState } from "react";
import { Paperclip, Image, Mic, FileText, X, Loader2 } from "lucide-react";
import { Popover } from "@/components/Index.jsx";
import chataxios from "@/services/chataxios";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

const FileUploadButton = ({ onUploaded, disabled }) => {
  const imageRef = useRef();
  const audioRef = useRef();
  const fileRef  = useRef();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const upload = async (file, msgType) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("msgType", msgType);

      const res = await chataxios.post("/chat/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { key, presignedUrl, fileName, fileSize, mimeType } = res.data.data;
      onUploaded({
        type:     msgType,
        content:  key,          // S3 key stored in DB
        presignedUrl,
        fileMeta: { name: fileName, size: fileSize, mime: mimeType },
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (msgType) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file, msgType);
    e.target.value = "";   // reset so same file can be re-selected
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={imageRef} type="file" hidden accept="image/*" onChange={handleChange("image")} />
      <input ref={audioRef} type="file" hidden accept="audio/*" onChange={handleChange("audio")} />
      <input ref={fileRef}  type="file" hidden
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleChange("file")}
      />

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled || uploading}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            "hover:bg-primary/10 text-muted-foreground hover:text-primary",
            (disabled || uploading) && "opacity-50 pointer-events-none",
          )}
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
            : <Paperclip className="h-4 w-4" />}
        </button>

        {open && (
          <>
            {/* Click outside overlay */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)} 
            />
            
            {/* Popover Card */}
            <div className="absolute bottom-10 -left-2 z-50 flex flex-col w-[200px] rounded-xl bg-card border border-border/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 pt-2.5 pb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Attach</p>
              </div>
              <div className="px-1.5 pb-1.5 space-y-0.5">
                <button
                  onClick={() => { imageRef.current?.click(); setOpen(false); }}
                  className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all text-left outline-none group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20 group-hover:scale-110 transition-transform">
                    <Image className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Image</p>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF</p>
                  </div>
                </button>
                <button
                  onClick={() => { audioRef.current?.click(); setOpen(false); }}
                  className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all text-left outline-none group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/20 group-hover:scale-110 transition-transform">
                    <Mic className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Audio</p>
                    <p className="text-[10px] text-muted-foreground">MP3, WAV, OGG</p>
                  </div>
                </button>
                <button
                  onClick={() => { fileRef.current?.click(); setOpen(false); }}
                  className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all text-left outline-none group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20 group-hover:scale-110 transition-transform">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Document</p>
                    <p className="text-[10px] text-muted-foreground">PDF, DOC, XLS, ZIP</p>
                  </div>
                </button>
              </div>
              
              {/* Bottom pointer arrow */}
              <div className="absolute -bottom-[5px] left-5 h-3 w-3 rotate-45 bg-card border-r border-b border-border/60" />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default FileUploadButton;
