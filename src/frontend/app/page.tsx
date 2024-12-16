"use client";
import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Upload } from "lucide-react";
import AllPage from "@/components/AllPage";
import ImagePage from "@/components/ImagePage";
import MusicPage from "@/components/MusicPage";
import InputForm from "@/components/InputImage";
import ResultsDisplay from "@/components/ImagePage";
import MidiDisplay from "@/components/MusicPage";
import MidiForm from "@/components/InputMidi";
import Image from "next/image";
import Icon from "@/public/icon.png";
import FastIcon from "@/public/lightning.svg";
import PreciseIcon from "@/public/accurate.svg";
import Link from "next/link";

interface UploadStatus {
  isUploading: boolean;
  success: boolean;
  error: string | null;
  datasetFolder: string | null;
}

const FileUploader: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<"all" | "image" | "music">(
    "all"
  );

  // Function to render the current page based on the selected tab
  const renderPage = () => {
    if (selectedTab === "all") return <AllPage />;
    if (selectedTab === "image")
      return <ResultsDisplay results={results} executionTime={executionTime} />;
    if (selectedTab === "music")
      return <MidiDisplay results={results2} executionTime={executionTime2} />;
  };
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
  const [results, setResults] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [results2, setResults2] = useState<any[]>([]);
  const [executionTime2, setExecutionTime2] = useState<number | null>(null);

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
    alert(response.data.message);
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
    alert(response.data.message);
  };

  // Handle Dropzone Uploads
  const handleUpload = async (
    acceptedFiles: File[],
    setUploadStatus: React.Dispatch<React.SetStateAction<UploadStatus>>,
    type: "image" | "music"
  ) => {
    const CHUNK_SIZE = 100; // Number of files per batch
    setUploadStatus({
      isUploading: true,
      success: false,
      error: null,
      datasetFolder: null,
    });

    try {
      // Split the files into chunks
      for (let i = 0; i < acceptedFiles.length; i += CHUNK_SIZE) {
        const chunk = acceptedFiles.slice(i, i + CHUNK_SIZE); // Get a chunk of files
        const formData = new FormData();

        chunk.forEach((file) => formData.append("files", file));

        // Upload the chunk
        const response = await axios.post(
          "http://127.0.0.1:8000/upload-folder/",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        if (i + CHUNK_SIZE >= acceptedFiles.length) {
          // Save dataset folder for the last chunk
          await saveToDatabase(type, response.data.dataset_folder);
          setUploadStatus({
            isUploading: false,
            success: true,
            error: null,
            datasetFolder: response.data.dataset_folder,
          });
        }
      }
    } catch (error) {
      setUploadStatus({
        isUploading: false,
        success: false,
        error: "Upload failed",
        datasetFolder: null,
      });
      console.error("Error during chunk upload:", error);
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

      alert(`Mapper uploaded successfully: ${correctFilename}`);
    } catch (error) {
      console.error("Error uploading mapper:", error);
      alert("Failed to upload mapper.");
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
      <div className="flex w-full min-h-screen flex-col">
        {/* Top Section */}
        <div className="bg-gradient-to-t from-black to-[#3b525a] px-10 md:px-20 py-7 min-h-screen">
          {/* Navbar */}
          <div className="flex justify-between items-center w-full">
            <Link
              href="/"
              className="font-semibold text-white text-sm md:text-base"
            >
              {" "}
              Spoti-find Lembang{" "}
            </Link>
            <Link
              href="/about"
              className="bg-[#a9fb50] rounded-full px-10 font-semibold py-3 hover:bg-[#7cbc39] cursor-pointer text-sm md:text-base"
            >
              {" "}
              About{" "}
            </Link>
          </div>

          {/* Hero */}
          <div className="mt-20 grid md:grid-cols-[70%_30%]">
            <div>
              <h1 className="bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text font-bold text-5xl md:text-7xl">
                Find Your Favorite Tunes, Any Way You Like!
              </h1>
              <p className="mt-10 text-[#939598] mb-10 text-sm md:text-base">
                {" "}
                Explore your music collection in a whole new way. Our platform
                lets you search for tracks by file, album cover, or record,{" "}
                making it easier to find the music you love, no matter how you
                know it.
              </p>
              <Link
                href="#search"
                className="bg-[#a9fb50] rounded-full px-10 font-semibold py-3 hover:bg-[#7cbc39] cursor-pointer"
              >
                Get Started
              </Link>
              <div className="flex gap-10 mt-20">
                <div className="flex justify-center items-center h-fit p-7 text-white bg-gradient-to-b from-[#22353a] to-[#1b2227] rounded-2xl gap-2">
                  <Image
                    src={FastIcon}
                    alt="Icon"
                    className="size-12 md:size-14"
                  />
                  <div className="flex flex-col">
                    <p className="text-2xl md:text-3xl font-bold">Fast</p>
                    <p className="font-light text-sm md:text-base">
                      {" "}
                      Processing
                    </p>
                  </div>
                </div>

                <div className="flex justify-center items-center h-fit p-7 text-white bg-gradient-to-b from-[#22353a] to-[#1b2227] rounded-2xl gap-3">
                  <Image
                    src={PreciseIcon}
                    alt="Icon"
                    className="size-12 md:size-14"
                  />
                  <div className="flex flex-col">
                    <p className="text-3xl font-bold">Precise</p>
                    <p className="font-light text-sm md:text-base">
                      {" "}
                      Search Results
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <Image src={Icon} alt="Icon" className="w-full" />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div
          className="bg-black flex pt-10 px-10 md:px-20 min-h-screen pb-20"
          id="search"
        >
          <div className="w-[30%] md:w-[20%] p-4 md:p-6 bg-gradient-to-b from-[#22353a] to-[#1b2227] space-y-6 flex flex-col rounded-xl text-white h-full justify-between mt-24">
            {/* Dropdown A */}
            <div>
              <h1 className="text-xs lg:text-base font-bold mb-10 bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text">
                Upload your Musics, Album Covers, and Mapper!
              </h1>
              {selectedTab === "image" && (
                <div>
                  <InputForm
                    onResults={(newResults) => setResults(newResults)}
                    onExecutionTime={(time) => setExecutionTime(time)}
                  />
                </div>
              )}
              {selectedTab === "music" && (
                <div>
                  <MidiForm
                    onResults={(newResults) => setResults2(newResults)}
                    onExecutionTime={(time) => setExecutionTime2(time)}
                  />
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xs lg:text-base font-bold bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text">
                  Image Dataset
                </h3>
                {imageDataset ? (
                  <>
                    <p className="text-xs lg:text-sm text-[#939598]">
                      Ready: {imageDataset}
                    </p>
                    <button
                      className="mt-2 px-4 py-2 text-xs lg:text-sm bg-[#861e1e] text-white rounded-full hover:bg-[#5d1414]"
                      onClick={() => handleDelete("image")}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <div
                    {...getRootPropsA()}
                    className="border-2 border-dashed p-6 text-center cursor-pointer mt-2 rounded-xl flex items-center justify-center "
                  >
                    <input {...getInputPropsA()} />
                    <Upload className="w-12 h-12 text-gray-400 hidden md:block" />
                    <p className="text-xs">Drag & drop files or folders here</p>
                  </div>
                )}
              </div>

              {/* Dropdown B */}
              <div>
                <h3 className="text-xs lg:text-base font-bold bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text">
                  Music Dataset
                </h3>
                {musicDataset ? (
                  <>
                    <p className="text-xs lg:text-sm text-[#939598]">
                      Ready: {musicDataset}
                    </p>
                    <button
                      className="mt-2 px-4 py-2 text-xs lg:text-sm bg-[#861e1e] text-white rounded-full hover:bg-[#5d1414]"
                      onClick={() => handleDelete("music")}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <div
                    {...getRootPropsB()}
                    className="border-2 border-dashed p-6 text-center cursor-pointer mt-2 rounded-xl flex items-center justify-center "
                  >
                    <input {...getInputPropsB()} />
                    <Upload className="w-12 h-12 text-gray-400 hidden md:block" />
                    <p className="text-xs">Drag & drop files or folders here</p>
                  </div>
                )}
              </div>

              {/* Mapper Input */}
              <div>
                <h3 className="text-xs md:text-base font-bold bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text">
                  Mapper
                </h3>
                {mapperName ? (
                  <>
                    <p className="text-xs lg:text-sm text-[#939598]">
                      Ready: {mapperName}
                    </p>
                    <button
                      className="mt-2 px-4 py-2 text-xs lg:text-sm bg-[#861e1e] text-white rounded-full hover:bg-[#5d1414] "
                      onClick={() => handleDelete("mapper")}
                    >
                      Delete
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
                      className="text-sm md:text-base text-red-400"
                    />
                    <button
                      className="text-xs md:text-sm mt-2 px-4 py-2 bg-[#a9fb50] hover:bg-[#7ab63a] text-black font-semibold rounded-full"
                      onClick={handleMapperUpload}
                    >
                      Upload
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="w-[80%] px-10 flex flex-col">
            <div className="relative">
              <div className="flex justify-between">
                {["all", "image", "music"].map((tab, index) => (
                  <button
                    key={tab}
                    onClick={() =>
                      setSelectedTab(tab as "all" | "image" | "music")
                    }
                    className={`py-2 px-4 flex-1 text-center mb-2 ${
                      selectedTab === tab
                        ? "font-bold text-[#a9fb50]"
                        : "font-bold text-[#939598]"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} Page
                  </button>
                ))}
              </div>
              {/* Sliding Border */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-[#a9fb50] transition-transform duration-300"
                style={{
                  transform: `translateX(${
                    selectedTab === "all"
                      ? "0%"
                      : selectedTab === "image"
                      ? "100%"
                      : "200%"
                  })`,
                  width: "33.33%", // Divide width equally for three tabs
                }}
              />
            </div>
            <div className="flex flex-col mt-12 ">{renderPage()}</div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FileUploader;
