import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadStatus {
  isUploading: boolean;
  success: boolean;
  error: string | null;
  datasetFolder: string | null;
}

interface ModeProps {
  all: boolean;
  image: boolean;
  music: boolean;
}

const FileUploader: React.FC<ModeProps> = ({ all, image, music }) => {
  const { toast } = useToast();
  const [uploadStatusA, setUploadStatusA] = useState<UploadStatus>({
    isUploading: false,
    success: false,
    error: null,
    datasetFolder: null,
  });
  const [uploadStatusB, setUploadStatusB] = useState<UploadStatus>({
    isUploading: false,
    success: false,
    error: null,
    datasetFolder: null,
  });
  const [selectedMapper, setSelectedMapper] = useState<File | null>(null);

  const [imageDataset, setImageDataset] = useState<string | null>(null);
  const [musicDataset, setMusicDataset] = useState<string | null>(null);
  const [mapperName, setMapperName] = useState<string | null>(null);

  // Fetch dataset and mapper status on component mount
  useEffect(() => {
    const fetchStatus = async () => {
      const response = await axios.get("/api/check-dataset-status");
      setImageDataset(response.data.imageDataset || null);
      setMusicDataset(response.data.musicDataset || null);
      setMapperName(response.data.mapperName || null);
    };
    fetchStatus();
  }, []);

  // Delete dataset or mapper
  const handleDelete = async (type: "image" | "music" | "mapper") => {
    const response = await axios.delete("/api/delete-dataset", {
      data: { type },
    });
    if (type === "image") setImageDataset(null);
    if (type === "music") setMusicDataset(null);
    if (type === "mapper") setMapperName(null);
    toast({
      title: response.data.message,
      variant: "default",
    });
    window.location.reload();
  };

  // Save dataset or mapper to the database
  const saveToDatabase = async (
    type: "image" | "music" | "mapper",
    name: string
  ) => {
    const formattedName =
      type === "mapper" && !name.endsWith(".json")
        ? `${name}.json`
        : name.replace("uploads\\", "");
    const response = await axios.post("/api/save-dataset", {
      type,
      name: formattedName,
    });
    toast({
      title: response.data.message,
      variant: "default",
    });
    window.location.reload();
  };

  // Handle Dropzone Uploads
  const handleUpload = async (
    acceptedFiles: File[],
    setUploadStatus: React.Dispatch<React.SetStateAction<UploadStatus>>,
    type: "image" | "music"
  ) => {
    setUploadStatus({
      isUploading: true,
      success: false,
      error: null,
      datasetFolder: null,
    });
    const formData = new FormData();
    acceptedFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/upload-folder/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setUploadStatus({
        isUploading: false,
        success: true,
        error: null,
        datasetFolder: response.data.dataset_folder,
      });
      await saveToDatabase(type, response.data.dataset_folder);
      window.location.reload();
    } catch (error) {
      setUploadStatus({
        isUploading: false,
        success: false,
        error: "Upload failed",
        datasetFolder: null,
      });
    }
  };

  // Handle Mapper Upload
  const handleMapperUpload = async () => {
    if (!selectedMapper) return;

    const formData = new FormData();
    formData.append("file", selectedMapper);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/upload-mapper/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // Debug backend response
      console.log("Mapper Upload Response:", response.data);

      const correctFilename = response.data.message.split(" ").pop(); // Extract the filename

      if (!correctFilename) {
        throw new Error("Filename is undefined in the backend response.");
      }

      // Save to the database
      await saveToDatabase("mapper", correctFilename);
      toast({
        title: "Mapper uploaded successfully!",
        description: correctFilename,
        variant: "default",
      });
      window.location.reload();
    } catch (error) {
      console.error("Error uploading mapper:", error);
      toast({
        title: "Failed to upload mapper!",
        variant: "destructive",
      });
    }
  };

  const { getRootProps: getRootPropsA, getInputProps: getInputPropsA } =
    useDropzone({
      onDrop: (acceptedFiles) =>
        handleUpload(acceptedFiles, setUploadStatusA, "image"),
      multiple: true,
    });

  const { getRootProps: getRootPropsB, getInputProps: getInputPropsB } =
    useDropzone({
      onDrop: (acceptedFiles) =>
        handleUpload(acceptedFiles, setUploadStatusB, "music"),
      multiple: true,
    });

  return (
    <main>
      <div className="w-full p-6 bg-white shadow-md rounded-xl border-2 h-[95vh] space-y-6 flex flex-col justify-between">
        {/* Dropdown A */}
        <div className="font-bold">
          <h1 className="mb-10"> WEBSITE </h1>
          <h1> Welcome to our website! </h1>
          <h1> What are you searching for today? </h1>
          {image && <div>image</div>}
          {music && <div>music</div>}
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Your Image Dataset</h3>
            {imageDataset ? (
              <>
                <p>Image dataset: {imageDataset}</p>
                <button
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => handleDelete("image")}
                >
                  Delete Dataset
                </button>
              </>
            ) : (
              <div
                {...getRootPropsA()}
                className="border-2 border-dashed p-6 text-center cursor-pointer"
              >
                <input {...getInputPropsA()} />
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p>Drag 'n' drop files or folders here</p>
              </div>
            )}
          </div>

          {/* Dropdown B */}
          <div>
            <h3 className="text-lg font-semibold">Your Music Dataset</h3>
            {musicDataset ? (
              <>
                <p>Music dataset: {musicDataset}</p>
                <button
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => handleDelete("music")}
                >
                  Delete Dataset
                </button>
              </>
            ) : (
              <div
                {...getRootPropsB()}
                className="border-2 border-dashed p-6 text-center cursor-pointer"
              >
                <input {...getInputPropsB()} />
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p>Drag 'n' drop files or folders here</p>
              </div>
            )}
          </div>

          {/* Mapper Input */}
          <div>
            <h3 className="text-lg font-semibold">Upload Mapper</h3>
            {mapperName ? (
              <>
                <p>Mapper: {mapperName}</p>
                <button
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => handleDelete("mapper")}
                >
                  Delete Mapper
                </button>
              </>
            ) : (
              <>
                <input
                  type="file"
                  accept=".txt,.json"
                  onChange={(e) =>
                    setSelectedMapper(e.target.files?.[0] || null)
                  }
                />
                <button
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={handleMapperUpload}
                >
                  Upload Mapper
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default FileUploader;
