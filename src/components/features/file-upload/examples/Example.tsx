"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { MobileFileUpload } from "..";

/**
 * Example component demonstrating the mobile file upload system
 */
export default function MobileFileUploadExample() {
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  const handleSuccess = (files: any[]) => {
    setUploadResults(prev => [...prev, ...files]);
    toast.success(`Successfully uploaded ${files.length} file(s)`);
  };

  const handleError = (error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">
          Mobile File Upload Demo
        </h1>
        <p className="text-[var(--text-secondary)]">
          Upload audio, video, and document files with mobile-optimized touch interactions
        </p>
      </div>

      {/* Main upload component */}
      <MobileFileUpload
        onSuccess={handleSuccess}
        onError={handleError}
        showAdvancedOptions={true}
        autoStartUpload={true}
        validationOptions={{
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxTotalSize: 500 * 1024 * 1024, // 500MB
          allowAudio: true,
          allowVideo: true,
          allowDocuments: true,
          maxFileCount: 5
        }}
      />

      {/* Upload results */}
      {uploadResults.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Upload Results ({uploadResults.length})
          </h2>
          <div className="space-y-2">
            {uploadResults.map((file, index) => (
              <div
                key={`${file.id || index}`}
                className="p-3 bg-[var(--surface-secondary)] rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {file.name}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {file.type} • {Math.round((file.size || 0) / 1024 / 1024)}MB
                    </p>
                  </div>
                  <div className="text-green-600">
                    ✓ Uploaded
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Mobile Features:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Tap anywhere in the upload area to select files</li>
          <li>• Swipe left on files to remove them</li>
          <li>• Swipe right on files to preview them</li>
          <li>• Enable WiFi-only mode to save mobile data</li>
          <li>• Uploads will automatically resume on network reconnection</li>
        </ul>
      </div>
    </div>
  );
}
