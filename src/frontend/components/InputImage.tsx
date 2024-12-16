"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface InputFormProps {
  onResults: (results: any[]) => void;
  onExecutionTime: (time: number | null) => void;
}

const InputForm: React.FC<InputFormProps> = ({
  onResults,
  onExecutionTime,
}) => {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [datasetPictureName, setDatasetPictureName] = useState<string | null>(
    null
  );
  const [mapperName, setMapperName] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchDatasetNames = async () => {
      try {
        const response = await fetch("/api/get-dataset-names");
        const data = await response.json();
        setDatasetPictureName(data.pictureName);
        setMapperName(data.mapperName);
      } catch (error) {
        console.error("Failed to fetch dataset names:", error);
      }
    };
    fetchDatasetNames();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedImage(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage || !datasetPictureName) {
      toast({
        title: "Please select an image or make sure dataset is available!",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("query_file", selectedImage);
    formData.append("dataset_folder", datasetPictureName);
    if (mapperName) {
      formData.append("mapper_file", mapperName);
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/find-similar-images/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process image.");
      }

      const data = await response.json();
      console.log("Result", data.results);
      onResults(data.results);
      onExecutionTime(data.execution_time);
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Error processing image!",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <h1 className="font-bold bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text text-xl mb-2">
        Find by Album!
      </h1>
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="text-red-400"
        />
      </div>
      {preview && (
        <div style={{ marginTop: "10px" }}>
          <img
            src={preview}
            alt="Preview"
            className="w-[80%] rounded-lg mb-2 border-2"
          />
        </div>
      )}
      <button
        onClick={handleSubmit}
        className="bg-[#a9fb50] hover:bg-[#7ab63a] rounded-full text-black font-bold px-4 py-2 mt-2 text-sm"
      >
        Search
      </button>
    </div>
  );
};

export default InputForm;
