"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import Image from "next/image";
import PlayIcon from "@/public/play.svg";
import PauseIcon from "@/public/pause.svg";
import VolumeIcon from "@/public/volume.svg";

interface MidiResult {
  filename: string; // The name of the MIDI file
  similarity: number; // The similarity score
  pictureFile: string | null; // Path to the associated MIDI file
  mapped_audio_name: string | null; // Name of the mapped audio from the mapper file
}

interface MidiDisplayProps {
  results: MidiResult[];
  executionTime: number | null;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const MidiDisplay: React.FC<MidiDisplayProps> = ({
  results,
  executionTime,
}) => {
  const [currentMidi, setCurrentMidi] = useState<string | null>(null);
  const [currentMidiIndex, setCurrentMidiIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const [datasetPictureName, setDatasetPictureName] = useState<string | null>(
    null
  );
  const [datasetMidiName, setDatasetMidiName] = useState<string | null>(null);
  const [filteredMidiFiles, setFilteredMidiFiles] = useState<MidiResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    setFilteredMidiFiles(
      results
        .filter((file) => {
          const filenameMatch = file.filename
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          const mappedAudioMatch =
            file.mapped_audio_name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) || false;
          return filenameMatch || mappedAudioMatch;
        })
        .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
    );
  }, [searchQuery, results]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = results
      .filter((file) => {
        const audioNameMatch = file.filename
          .toLowerCase()
          .includes(query.toLowerCase());
        const mappedAudioMatch =
          file.mapped_audio_name?.toLowerCase().includes(query.toLowerCase()) ||
          false;
        return audioNameMatch || mappedAudioMatch;
      })
      .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

    setFilteredMidiFiles(filtered);
    setCurrentPage(filtered.length > 0 ? 1 : 0); // Reset to the first page after filtering
  };

  const loadAndPlayMidi = async (filePath: string) => {
    try {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }

      Tone.Transport.cancel();
      Tone.Transport.seconds = 0;

      const midi = await Midi.fromUrl(
        `http://127.0.0.1:8000/uploads/${datasetMidiName}/${filePath}`
      );
      const synth = new Tone.PolySynth().toDestination();
      synth.volume.value = Tone.gainToDb(volume);
      synthRef.current = synth;

      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          Tone.Transport.schedule((time) => {
            synth.triggerAttackRelease(note.name, note.duration, time);
          }, note.time);
        });
      });

      setDuration(midi.duration);
      Tone.Transport.start();
      setIsPlaying(true);

      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = setInterval(() => {
        setProgress(Tone.Transport.seconds / midi.duration || 0);
      }, 100);
    } catch (error) {
      console.error("Error loading and playing MIDI:", error);
    }
  };

  const playMidi = (filePath: string, index: number) => {
    if (currentMidi !== filePath) {
      setCurrentMidi(filePath);
      setCurrentMidiIndex(index);
      loadAndPlayMidi(filePath);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);

      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = setInterval(() => {
        setProgress(Tone.Transport.seconds / duration || 0);
      }, 100);
    }
  };

  const pauseMidi = () => {
    Tone.Transport.pause();
    setIsPlaying(false);

    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const handleProgressChange = (value: number) => {
    if (duration) {
      const newTime = value * duration;
      Tone.Transport.seconds = newTime;
      setProgress(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (synthRef.current) {
      synthRef.current.volume.value = Tone.gainToDb(value);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredMidiFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredMidiFiles.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchDatasetNames = async () => {
      try {
        const response = await fetch("/api/get-dataset-names");
        const data = await response.json();
        setDatasetPictureName(data.pictureName);
        setDatasetMidiName(data.midiName);
      } catch (error) {
        console.error("Failed to fetch dataset names:", error);
      }
    };

    fetchDatasetNames();
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  return (
    <div className="w-full relative h-full flex flex-col justify-center items-center pb-20">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-full px-5 py-3 bg-[#1f1f1f] mb-4 text-white focus:outline-0 placeholder:text-sm"
      />
      {results.length === 0 && (
        <p className="text-[#939598]"> No song matches</p>
      )}
      <div className="grid grid-cols-5 gap-5 w-full">
        {currentResults.map((result, index) => (
          <div
            key={index}
            style={{
              cursor: "pointer",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            className="rounded-xl flex flex-col items-center pb-3 bg-[#1f1f1fee] relative hover:opacity-40 group"
            onClick={() =>
              isPlaying && currentMidi === result.filename
                ? pauseMidi()
                : playMidi(result.filename!, index + startIndex)
            }
          >
            <Image
              src={PlayIcon}
              alt="Icon"
              className="absolute top-[30%] hidden group-hover:block w-10 z-10"
            />
            {result.pictureFile ? (
              <img
                src={`http://127.0.0.1:8000/uploads/${datasetPictureName}/${result.pictureFile}`}
                alt=""
                className="w-full object-cover rounded-t-xl h-[190px]"
              />
            ) : (
              <img
                src="/placeholder.png"
                alt=""
                className="w-full object-cover rounded-t-xl"
              />
            )}
            {result.mapped_audio_name ? (
              <p className="text-white mt-2 font-semibold">
                {result.mapped_audio_name}
              </p>
            ) : (
              <p className="text-white mt-2 font-semibold">{result.filename}</p>
            )}
            <p className="bg-[#a9fb50] px-4 py-2 rounded-full text-xs font-semibold mt-2">
              Matches: {result.similarity.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      {executionTime !== null && (
        <p className="mt-3 text-[#939598] text-sm">
          {results.length} results in {executionTime.toFixed(2)} seconds
        </p>
      )}

      {/* Pagination Controls */}
      {results.length > itemsPerPage && (
        <div className="text-center mt-10 text-[#939598] flex gap-10 items-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            className={`bg-[#1f1f1f] py-1 px-3 rounded-full font-bold ${
              currentPage > 1 && "text-[#a9fb50]"
            }`}
          >
            &lt;
          </button>
          <span style={{ margin: "0 10px" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`font-bold bg-[#1f1f1f] py-1 px-3 rounded-full ${
              currentPage !== totalPages && "text-[#a9fb50]"
            }`}
          >
            &gt;
          </button>
        </div>
      )}

      {/* Universal MIDI Controller */}
      {currentMidi && (
        <div className="bg-gradient-to-b from-[#22353a] to-[#1b2227] text-white absolute -bottom-16 w-full rounded-xl p-6">
          {results[currentMidiIndex!]?.mapped_audio_name ? (
            <h3 className="text-center font-semibold">
              {results[currentMidiIndex!]?.mapped_audio_name}
            </h3>
          ) : (
            <h3 className="text-center font-semibold">
              {results[currentMidiIndex!]?.filename}
            </h3>
          )}
          <div className="text-center text-sm text-[#939598]">
            {formatTime(progress * duration)} / {formatTime(duration)}
          </div>
          <div className="flex gap-10 items-center w-full">
            <div className="flex gap-2 items-center justify-center">
              <Image src={VolumeIcon} alt="Icon" className="size-4 mt-[5px]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 appearance-none rounded-lg mt-1"
                style={{
                  background: `linear-gradient(to right, white ${
                    progress * 100
                  }%, gray ${volume * 100}%)`,
                }}
              />
            </div>
            <div className="flex gap-2 items-center justify-center w-full">
              <button
                onClick={
                  isPlaying
                    ? pauseMidi
                    : () => playMidi(currentMidi, currentMidiIndex!)
                }
              >
                {isPlaying ? (
                  <Image
                    src={PauseIcon}
                    alt="Icon"
                    className="size-3 mt-1 cursor-pointer"
                  />
                ) : (
                  <Image
                    src={PlayIcon}
                    alt="Icon"
                    className="size-4 mt-1 cursor-pointer"
                  />
                )}
              </button>
              <div
                style={{ marginTop: "10px" }}
                className="w-full flex items-center justify-center"
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={progress}
                  onChange={(e) =>
                    handleProgressChange(parseFloat(e.target.value))
                  }
                  className="w-full h-1 appearance-none rounded-lg mb-1"
                  style={{
                    background: `linear-gradient(to right, white ${
                      progress * 100
                    }%, gray ${progress * 100}%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MidiDisplay;
