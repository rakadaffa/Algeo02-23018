"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MidiFormProps {
  onResults: (results: any[]) => void;
  onExecutionTime: (time: number | null) => void;
}

const MidiForm: React.FC<MidiFormProps> = ({ onResults, onExecutionTime }) => {
  const { toast } = useToast();
  const [selectedMidi, setSelectedMidi] = useState<File | null>(null);
  const [datasetMidiName, setDatasetMidiName] = useState<string | null>(null);
  const [mapperName, setMapperName] = useState<string | null>(null);

  // Fetch dataset and mapper names
  React.useEffect(() => {
    const fetchDatasetNames = async () => {
      try {
        const response = await fetch("/api/get-dataset-names");
        const data = await response.json();
        setDatasetMidiName(data.midiName);
        setMapperName(data.mapperName);
      } catch (error) {
        console.error("Failed to fetch dataset names:", error);
      }
    };
    fetchDatasetNames();
  }, []);

  const handleMidiUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedMidi(file);
  };

  const handleSubmit = async () => {
    if (!selectedMidi || !datasetMidiName) {
      toast({
        title: "Please select a music or make sure dataset is available!",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("query_file", selectedMidi);
    formData.append("dataset_folder", datasetMidiName);
    if (mapperName) {
      formData.append("mapper_file", mapperName);
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/find-similar-midi/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process MIDI file.");
      }

      const data = await response.json();
      console.log("Result", data.results);
      onResults(data.results);
      onExecutionTime(data.execution_time);
    } catch (error) {
      console.error("Error processing MIDI file:", error);
      toast({
        title: "Error processing MIDI file!",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <h1 className="font-bold bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text text-xl mb-2">
        Find by Midi!
      </h1>
      <div>
        <input
          type="file"
          accept=".mid,.midi"
          onChange={handleMidiUpload}
          className="text-red-400"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="bg-[#a9fb50] hover:bg-[#7ab63a] rounded-full text-black font-bold px-4 py-2 mt-2 text-sm"
      >
        Search
      </button>
    </div>
  );
};

export default MidiForm;
