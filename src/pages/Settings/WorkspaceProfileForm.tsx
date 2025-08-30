import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFileToS3 } from "../../utils/s3Upload";

type WorkspaceProfileFormProps = {
  name: string;
  url: string;
  avatarUrl: string | null;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onAvatarUrlChange: (v: string) => void;
  onBlurSave?: () => void | Promise<void>;
  submitButton?: React.ReactNode; // Optional submit button for create page
  disabled?: boolean;
};

const WorkspaceProfileForm: React.FC<WorkspaceProfileFormProps> = ({
  name,
  url,
  avatarUrl,
  onNameChange,
  onUrlChange,
  onAvatarUrlChange,
  onBlurSave,
  submitButton,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || disabled) return;

      const file = acceptedFiles[0];

      if (!file.type.startsWith("image/")) {
        // eslint-disable-next-line no-alert
        alert("Please upload an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // eslint-disable-next-line no-alert
        alert("File size should be less than 5MB");
        return;
      }

      setIsUploading(true);
      try {
        const uploadedUrl = await uploadFileToS3(
          file,
          `${import.meta.env.VITE_ENV}/workspace-avatars`,
        );
        onAvatarUrlChange(uploadedUrl);
      } catch (_e) {
        // eslint-disable-next-line no-alert
        alert("Failed to upload logo");
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, onAvatarUrlChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".svg"],
    },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  return (
    <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-medium text-gray-900">Workspace Settings</h2>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <div className="flex items-center">
              <div
                {...getRootProps()}
                className={`h-16 w-16 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer border-2 ${
                  isDragActive
                    ? "border-blue-500 border-dashed"
                    : "border-gray-200"
                } hover:border-blue-400 transition-colors`}
                aria-disabled={disabled || isUploading}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-blue-500 border-gray-300" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Workspace logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-xl">W</span>
                )}
              </div>
              <div className="ml-5">
                <p className="text-sm text-gray-600">Click or drag and drop to upload</p>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG, SVG, GIF up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="ws-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workspace Name
            </label>
            <input
              type="text"
              id="ws-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={() => onBlurSave?.()}
              disabled={disabled}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-60"
            />
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="ws-url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workspace URL
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-600 sm:text-sm">
                wallie.app/
              </span>
              <input
                type="text"
                id="ws-url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                onBlur={() => onBlurSave?.()}
                disabled={disabled}
                className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-60"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Use lowercase letters, numbers, and hyphens only.</p>
          </div>

          {submitButton ? <div className="pt-2">{submitButton}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceProfileForm;