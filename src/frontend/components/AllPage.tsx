"use client";

import React, { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import PlayIcon from "@/public/play.svg";
import Image from "next/image";
import PauseIcon from "@/public/pause.svg";
import VolumeIcon from "@/public/volume.svg";

interface MidiFile {
  audio_file: string;
  audio_name: string;
  pic_name: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function MusicPlayer() {
  const [midiFiles, setMidiFiles] = useState<MidiFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredMidiFiles, setFilteredMidiFiles] = useState<MidiFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 15; // 5x5 grid
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const transportInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const datasetResponse = await fetch("/api/get-dataset-names");
        const { midiName, pictureName, mapperName } =
          await datasetResponse.json();
        if (!midiName) {
          console.log("No MIDI dataset found");
          return;
        }

        const midiResponse = await fetch(
          `http://127.0.0.1:8000/list-midi-files/?folder=${midiName}`
        );
        const midiFiles = await midiResponse.json();

        let mapper: {
          audio_file: string;
          audio_name: string;
          pic_name: string;
        }[] = [];
        if (mapperName) {
          const mapperResponse = await fetch(
            `http://127.0.0.1:8000/uploads/${mapperName}`
          );
          mapper = await mapperResponse.json();
        }

        const mapped = midiFiles.files.map((midiFile: string) => {
          const mapping = mapper.find((entry) => entry.audio_file === midiFile);
          return {
            audio_file: `${midiName}/${midiFile}`,
            audio_name: mapping?.audio_name || midiFile,
            pic_name: mapping?.pic_name
              ? `http://127.0.0.1:8000/uploads/${pictureName}/${mapping.pic_name}`
              : "/placeholder.png",
          };
        });

        setMidiFiles(mapped);
        setFilteredMidiFiles(mapped);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);
  useEffect(() => {
    setFilteredMidiFiles(
      midiFiles.filter((file) =>
        file.audio_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, midiFiles]);

  const loadAndPlayMidi = async (filePath: string) => {
    try {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }

      Tone.Transport.cancel();
      Tone.Transport.seconds = 0;

      const midi = await Midi.fromUrl(filePath);

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

      if (transportInterval.current) clearInterval(transportInterval.current);
      transportInterval.current = setInterval(() => {
        setProgress(Tone.Transport.seconds / midi.duration || 0);
      }, 100);
    } catch (error) {
      console.error("Error loading and playing MIDI:", error);
    }
  };

  const playMidi = () => {
    if (currentFileIndex !== null) {
      if (!isPlaying) {
        Tone.Transport.start();
        setIsPlaying(true);

        if (transportInterval.current) clearInterval(transportInterval.current);
        transportInterval.current = setInterval(() => {
          setProgress(Tone.Transport.seconds / duration || 0);
        }, 100);
      }
    }
  };

  const pauseMidi = () => {
    Tone.Transport.pause();
    setIsPlaying(false);

    if (transportInterval.current) clearInterval(transportInterval.current);
  };

  const selectFile = (index: number) => {
    setCurrentFileIndex(index);
    setProgress(0);
    setIsPlaying(false);
    loadAndPlayMidi(
      `http://127.0.0.1:8000/uploads/${midiFiles[index].audio_file}`
    );
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
  const currentMidiFiles = filteredMidiFiles.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = midiFiles.filter((file) =>
      file.audio_name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredMidiFiles(filtered);
    {
      filtered.length > 0 ? setCurrentPage(1) : setCurrentPage(0);
    } // Reset to the first page after filtering
  };
  return (
    <div className="w-full relative h-full flex flex-col justify-center items-center pb-20">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-full px-5 py-3 bg-[#1f1f1f] mb-4 text-white focus:outline-0 placeholder:text-sm"
      />
      {currentMidiFiles.length === 0 ? (
        <p className="text-[#939598]">No MIDI files found</p>
      ) : (
        <div>
          <div className="grid grid-cols-5 gap-5 w-full">
            {currentMidiFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  cursor: "pointer",
                  // background:
                  //   index + startIndex === currentFileIndex ? "#ddd" : "#fff",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                className="rounded-xl flex flex-col items-center pb-3 bg-[#1f1f1fee] relative hover:opacity-40 group"
                onClick={() => selectFile(index + startIndex)}
              >
                <Image
                  src={PlayIcon}
                  alt="Icon"
                  className="absolute top-[30%] hidden group-hover:block w-10 z-10"
                />
                <img
                  src={file.pic_name}
                  alt={file.audio_name}
                  className="w-full object-cover rounded-t-xl h-[190px]"
                />
                <p className="text-white mt-2 font-semibold">
                  {file.audio_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {midiFiles.length > itemsPerPage && (
        <div className="text-center mt-10 text-[#939598] flex gap-10 items-center">
          <button
            className={`bg-[#1f1f1f] py-1 px-3 rounded-full font-bold ${
              currentPage > 1 && "text-[#a9fb50]"
            }`}
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || currentPage === 0}
          >
            &lt;
          </button>
          <span style={{ margin: "0 10px" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={`font-bold bg-[#1f1f1f] py-1 px-3 rounded-full ${
              currentPage !== totalPages && "text-[#a9fb50]"
            }`}
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}

      {currentFileIndex !== null && (
        <div className="bg-gradient-to-b from-[#22353a] to-[#1b2227] text-white absolute -bottom-16 w-full rounded-xl p-6">
          <h2 className="text-center font-semibold">
            {midiFiles[currentFileIndex].audio_name}
          </h2>
          <div className="text-center text-sm text-[#939598]">
            {formatTime(Tone.Transport.seconds)} / {formatTime(duration)}
          </div>
          {/* Playback Controls */}
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
              <button onClick={isPlaying ? pauseMidi : playMidi}>
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
}
