from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import zipfile
import rarfile
import py7zr
import os
from io import BytesIO
import json
import shutil
from typing import List, Optional
from pathlib import Path
import re
from fastapi.staticfiles import StaticFiles
import numpy as np
import time
import cv2
from mido import MidiFile
from scipy.spatial.distance import cosine

app = FastAPI()

# Allowing CORS for your frontend (adjust the URL if necessary)
origins = [
    "http://localhost:3000",  # Your frontend URL (Next.js default)
    "http://127.0.0.1:3000",  # Alternative URL
    "*",  # Allow all origins (use with caution in production)
]

# Add CORS middleware to the app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows the specified origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)

# Base uploads directory
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
def find_next_dataset_folder():
    """Find the next available dataset folder name."""
    i = 0
    while True:
        dataset_folder = UPLOADS_DIR / f"dataset{i}"
        if not dataset_folder.exists():
            return dataset_folder
        i += 1

def flatten_and_copy_files(source_dir: Path, destination_dir: Path):
    """Recursively flatten a directory structure by copying all files."""
    destination_dir.mkdir(parents=True, exist_ok=True)
    
    used_filenames = set()
    
    def copy_with_unique_name(src_file: Path):
        """Copy a file with a unique name to avoid conflicts"""
        base_name = src_file.stem
        suffix = src_file.suffix
        counter = 0
        
        while True:
            if counter == 0:
                new_filename = f"{base_name}{suffix}"
            else:
                new_filename = f"{base_name}_{counter}{suffix}"
            
            if new_filename not in used_filenames:
                used_filenames.add(new_filename)
                
                dest_path = destination_dir / new_filename
                shutil.copy2(src_file, dest_path)
                break
            
            counter += 1
    
    for item in source_dir.rglob('*'):
        if item.is_file():
            copy_with_unique_name(item)

def extract_archive(file, destination):
    """Extract various archive types (zip, rar) to destination."""
    temp_extract_dir = destination / "temp_extract"
    temp_extract_dir.mkdir(parents=True, exist_ok=True)
    
    file_content = file.file.read()
    file_like = BytesIO(file_content)
    
    try:
        if file.filename.lower().endswith('.zip'):
            with zipfile.ZipFile(file_like, 'r') as zip_ref:
                zip_ref.extractall(temp_extract_dir)
        elif file.filename.lower().endswith(('.rar', '.cbr')):
            with rarfile.RarFile(file_like, 'r') as rar_ref:
                rar_ref.extractall(temp_extract_dir)
        elif file.filename.lower().endswith('.7z'):
            with py7zr.SevenZipFile(file_like, mode='r') as seven_zip_ref:
                seven_zip_ref.extractall(temp_extract_dir)
        
        flatten_and_copy_files(temp_extract_dir, destination)
    
    finally:
        shutil.rmtree(temp_extract_dir, ignore_errors=True)

@app.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):
    """Upload a single image file."""
    # Validate file type
    allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp'}
    file_ext = os.path.splitext(file.filename.lower())[1]
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Create uploads directory if not exists
    UPLOADS_DIR.mkdir(exist_ok=True)
    
    # Save the file
    file_path = UPLOADS_DIR / f"{file.filename}"
    with open(file_path, 'wb') as buffer:
        buffer.write(await file.read())
    
    return JSONResponse(content={
        "message": "Image uploaded successfully",
        "filename": file.filename
    })

@app.post("/upload-audio/")
async def upload_audio(file: UploadFile = File(...)):
    """Upload a single audio file."""
    # Validate file type
    allowed_extensions = {'.mid', '.midi', '.wav'}
    file_ext = os.path.splitext(file.filename.lower())[1]
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Create uploads directory if not exists
    UPLOADS_DIR.mkdir(exist_ok=True)
    
    # Save the file
    file_path = UPLOADS_DIR / f"{file.filename}"
    with open(file_path, 'wb') as buffer:
        buffer.write(await file.read())
    
    return JSONResponse(content={
        "message": "Audio file uploaded successfully",
        "filename": file.filename
    })

@app.post("/upload-folder/")
async def upload_folder(files: List[UploadFile] = File(...)):
    """Upload and process multiple files/archives/folders."""
    try:
        # Find next available dataset folder
        dataset_folder = find_next_dataset_folder()
        dataset_folder.mkdir(parents=True, exist_ok=False)
        
        # Process each uploaded file
        for file in files:
            if not file.filename:
                continue
            
            if file.filename.lower().endswith(('.zip', '.rar', '.cbr', '.7z')):
                # Extract archive and flatten
                extract_archive(file, dataset_folder)
            elif file.filename.lower() == '.ds_store':
                # Skip macOS system files
                continue
            else:
                # Save individual files
                file_path = dataset_folder / file.filename
                with open(file_path, 'wb') as f:
                    f.write(file.file.read())
        
        return JSONResponse(content={
            "message": f"Files uploaded successfully to {dataset_folder}",
            "dataset_folder": str(dataset_folder)
        }, status_code=200)
    
    except Exception as e:
        return JSONResponse(content={
            "error": str(e)
        }, status_code=500)

@app.get("/list-datasets/")
async def list_datasets():
    """List all existing dataset folders."""
    try:
        datasets = [
            folder.name for folder in UPLOADS_DIR.iterdir() 
            if folder.is_dir() and folder.name.startswith('dataset')
        ]
        return JSONResponse(content={
            "datasets": sorted(datasets)
        }, status_code=200)
    except Exception as e:
        return JSONResponse(content={
            "error": str(e)
        }, status_code=500)

def find_next_mapper_filename():
    """Find the next available mapper file name in sequential order."""
    i = 0
    while True:
        candidate = UPLOADS_DIR / f"mapper{i}.json"
        if not candidate.exists():
            return candidate
        i += 1

def parse_txt_to_json(content: str):
    """Parse the text content into JSON, handling spaces in multi-word fields."""
    lines = content.strip().split("\n")
    header = lines[0].strip().split()  # Extract header fields
    if header != ["audio_file", "audio_name", "pic_name"]:
        raise ValueError("Invalid header format. Expected 'audio_file audio_name pic_name'.")

    data = []

    for line in lines[1:]:
        # Split the line into parts
        parts = line.strip().split()
        if len(parts) < 3:
            raise ValueError(f"Invalid line format: '{line}'. Expected at least 3 parts.")

        # Assign the first part as audio_file
        audio_file = parts[0]

        # Assign the last part as pic_name
        pic_name = parts[-1]

        # Combine all middle parts as audio_name
        audio_name = " ".join(parts[1:-1])

        # Append the structured data
        data.append({
            "audio_file": audio_file,
            "audio_name": audio_name,
            "pic_name": pic_name,
        })

    return data

@app.post("/upload-mapper/")
async def upload_mapper(file: UploadFile = File(...)):
    try:
        # Ensure uploads directory exists
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

        # Handle .txt files and convert to JSON
        if file.filename.lower().endswith(".txt"):
            # Read the content of the uploaded file
            content = (await file.read()).decode("utf-8")

            # Parse the .txt file into structured data
            data = parse_txt_to_json(content)

            # Find the next available mapper file name
            json_path = find_next_mapper_filename()

            # Save as .json
            with open(json_path, "w", encoding="utf-8") as json_file:
                json.dump(data, json_file, indent=4)

            return JSONResponse(content={"message": f"Mapper uploaded and converted to {json_path.name}"})

        # Handle .json files directly
        elif file.filename.lower().endswith(".json"):
            json_path = find_next_mapper_filename()
            with open(json_path, "wb") as f:
                f.write(await file.read())
            return JSONResponse(content={"message": f"Mapper uploaded as {json_path.name}"})
        
        # Reject unsupported file formats
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Only .txt and .json are supported.")
    
    except ValueError as ve:
        return JSONResponse(content={"message": f"Invalid file format: {str(ve)}"}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"message": f"Failed to upload mapper: {str(e)}"}, status_code=400)

@app.get("/list-midi-files/")
async def list_midi_files(folder: str):
    folder_path = UPLOADS_DIR / folder
    if not folder_path.is_dir():
        return {"error": "Folder does not exist"}

    midi_files = [
        f.name for f in folder_path.iterdir() if f.suffix.lower() in [".mid", ".midi"]
    ]
    return {"files": midi_files}

@app.get("/list-picture-files/")
async def list_picture_files(folder: str):
    folder_path = UPLOADS_DIR / folder
    if not folder_path.is_dir():
        return {"error": "Folder does not exist"}

    picture_files = [
        f.name
        for f in folder_path.iterdir()
        if f.suffix.lower() in [".png", ".jpg", ".jpeg"]
    ]
    return {"files": picture_files}
# 1. Preprocessing
def preprocess_image(img, image_size=(50, 50)):
    img = cv2.equalizeHist(img)
    img_resized = cv2.resize(img, image_size)
    return img_resized / 255.0

def preprocess_images(folder_path, image_size=(50, 50)):
    images, filenames, processed_images, original_images_color = [], [], [], []
    valid_extensions = {'.png', '.jpg', '.jpeg'}
    for filename in os.listdir(folder_path):
        if os.path.splitext(filename.lower())[1] in valid_extensions:
            img_path = os.path.join(folder_path, filename)
            try:             
                img_color = cv2.imread(img_path, cv2.IMREAD_COLOR)
                img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)
                original_images_color.append(cv2.cvtColor(img_color, cv2.COLOR_BGR2RGB))
                img_preprocessed = preprocess_image(img_gray, image_size)
                images.append(img_preprocessed.flatten())
                filenames.append(filename)
                processed_images.append(img_preprocessed)
            except Exception as E:
                continue

    return np.array(images), filenames, processed_images, original_images_color

# 2. Data Centering
def standardize_images(image_matrix):
    mean_vector = np.mean(image_matrix, axis=0)
    std_vector = np.std(image_matrix, axis=0)
    standardized_matrix = (image_matrix - mean_vector) / (std_vector + 1e-10)
    return standardized_matrix, mean_vector, std_vector

# 3. Explained Variance
def plot_explained_variance_with_svd(eigenValue, eigenValueSum):
    explained_variance = eigenValue / eigenValueSum
    cumulative_variance = np.cumsum(explained_variance)
    n_components = np.argmax(cumulative_variance >= 0.95) + 1
    
    return cumulative_variance, n_components

# 4. Compute PCA
def compute_pca_with_svd(standardized_matrix, U, n_components):
    Uk = U[:n_components].T
    projections = np.dot(standardized_matrix, Uk)
    
    return Uk, projections
   

# 5. Similarity Computation
def calculate_euclidean_distance(query_projection, dataset_projections):
    distances = np.sqrt(np.sum((query_projection - dataset_projections)**2, axis=1))
    mean_distance = np.mean(distances) + 1e-10
    similarities = (1 - distances / mean_distance) * 100
    return similarities, distances

@app.post("/find-similar-images/")
async def find_similar_images(
    query_file: UploadFile,
    dataset_folder: str = Form(...),
    mapper_file: Optional[str] = Form(None)
):
    start_time = time.time()

    # Preprocess dataset images
    dataset_path = UPLOADS_DIR / dataset_folder
    if not dataset_path.is_dir():
        return JSONResponse(content={"error": "Dataset folder not found"}, status_code=400)

    # Load and preprocess query image
    query_image = await query_file.read()
    query_array = np.frombuffer(query_image, np.uint8)
    query_img = cv2.imdecode(query_array, cv2.IMREAD_COLOR)
    query_image_gray = cv2.cvtColor(query_img, cv2.COLOR_BGR2GRAY)
    query_preprocessed = preprocess_image(query_image_gray, (50, 50))
    query_flattened = query_preprocessed.flatten()
    
    # Preprocess dataset images
    image_matrix, filenames, processed_images, original_images_color = preprocess_images(str(dataset_path))

    # Standardize images
    standardized_matrix, mean_vector, std_vector = standardize_images(image_matrix)
    query_standardized = (query_flattened - mean_vector) / (std_vector + 1e-10)

    # Compute covariance matrix and perform SVD
    covariance_matrix = np.cov(standardized_matrix.T)
    U, S, Ut = np.linalg.svd(covariance_matrix)
    eigenValue = S
    eigenValueSum = np.sum(eigenValue)

    # Determine number of components for 95% variance
    cumulative_variance, n_components = plot_explained_variance_with_svd(eigenValue, eigenValueSum)

    # Perform PCA
    Uk, dataset_projections = compute_pca_with_svd(standardized_matrix, U, n_components)
    query_projection = np.dot(query_standardized, Uk)

    # Calculate similarities
    similarities, distances = calculate_euclidean_distance(query_projection, dataset_projections)
    results = [
        {"filename": filename, "similarity": float(similarity)}
        for filename, similarity in zip(filenames, similarities)
        if 50 <= similarity <= 100
    ]

    # Optionally integrate mapper
    if mapper_file:
        mapper_path = UPLOADS_DIR / mapper_file
        if mapper_path.is_file():
            try:
                with open(mapper_path, "r", encoding="utf-8") as f:
                    mapper = json.load(f)
                results = [
                    {
                        **result,
                        "mapped_audio_name": next(
                            (entry["audio_name"] for entry in mapper if entry["pic_name"] == result["filename"]),
                            None
                        ),
                        "midiFile": next(
                            (entry["audio_file"] for entry in mapper if entry["pic_name"] == result["filename"]),
                            None
                        ),
                    }
                    for result in results
                ]
            except json.JSONDecodeError:
                return JSONResponse(content={"error": "Invalid JSON in mapper file"}, status_code=400)

    # Calculate execution time
    end_time = time.time()
    return JSONResponse(
        content={
            "results": results,
            "execution_time": end_time - start_time
        }
    )

# Helper functions
def load_midi_files(directory):
    return [os.path.join(directory, f) for f in os.listdir(directory) if f.endswith((".mid", ".midi"))]


def extract_features_with_tempo(midi_file):
    try:
        mid = MidiFile(midi_file)
    except Exception as e:
        print(f"Error reading {midi_file}: {e}")
        return [], [], [], 500000, None

    pitches, velocities, timings = [], [], []
    tempo = 500000
    ticks_per_beat = mid.ticks_per_beat

    current_time = 0
    for track in mid.tracks:
        for msg in track:
            current_time += msg.time
            if msg.type == 'set_tempo':
                tempo = msg.tempo
            elif msg.type == 'note_on' and msg.velocity > 0:
                pitches.append(msg.note)
                velocities.append(msg.velocity)
                timings.append(current_time)

    return pitches, velocities, timings, tempo, ticks_per_beat


def normalize_pitch_with_mean_std(pitches):
    if len(pitches) == 0:
        return []
    mean_pitch = np.mean(pitches)
    std_pitch = np.std(pitches) if np.std(pitches) > 0 else 1
    return [(pitch - mean_pitch) / std_pitch for pitch in pitches]


def segment_pitches_with_windowing_and_normalization(pitches, timings, window_size_beats, step_size_beats, ticks_per_beat, tempo):
    segments = []
    if not pitches or not timings:
        return segments

    window_size_ticks = window_size_beats * ticks_per_beat
    step_size_ticks = step_size_beats * ticks_per_beat

    start_idx = 0
    while start_idx < len(timings):
        end_idx = start_idx
        while end_idx < len(timings) and (timings[end_idx] - timings[start_idx]) <= window_size_ticks:
            end_idx += 1
        segment_pitches = pitches[start_idx:end_idx]
        if segment_pitches:
            segments.append(normalize_pitch_with_mean_std(segment_pitches))
        start_idx += int(step_size_ticks)
    return segments


def compute_and_normalize_histogram(data, bins, range_):
    hist, _ = np.histogram(data, bins=bins, range=range_)
    total = np.sum(hist)
    return hist / total if total > 0 else hist


def extract_normalized_histograms(pitches):
    if not pitches:
        return None

    atb = compute_and_normalize_histogram(pitches, bins=128, range_=(0, 127))
    rtb = compute_and_normalize_histogram(np.diff(pitches), bins=255, range_=(-127, 127))
    ftb = compute_and_normalize_histogram(np.array(pitches) - pitches[0], bins=255, range_=(-127, 127))

    return atb, rtb, ftb


def process_query_final(query_file, window_size, step_size):
    pitches, _, timings, tempo, ticks_per_beat = extract_features_with_tempo(query_file)
    segments = segment_pitches_with_windowing_and_normalization(pitches, timings, window_size, step_size, ticks_per_beat, tempo)
    histograms = [extract_normalized_histograms(segment) for segment in segments if segment]
    return histograms


def process_dataset_final(midi_files, window_size, step_size):
    dataset_features = []
    for file in midi_files:
        pitches, _, timings, tempo, ticks_per_beat = extract_features_with_tempo(file)
        if not pitches and not timings:
            continue
        segments = segment_pitches_with_windowing_and_normalization(pitches, timings, window_size, step_size, ticks_per_beat, tempo)
        histograms = [extract_normalized_histograms(segment) for segment in segments if segment]
        dataset_features.append((os.path.basename(file), histograms))
    return dataset_features


def compute_similarity(hist1, hist2):
    return 1 - cosine(hist1, hist2)


def retrieve_similar_files_with_rank(query_file, dataset_features, weights, window_size, step_size):
    query_histograms = process_query_final(query_file, window_size, step_size)

    scores = []
    for file, histograms_list in dataset_features:
        dataset_array = [h for h in histograms_list if h]
        query_array = [h for h in query_histograms if h]

        similarity_matrix = np.array([
            [
                sum(w * compute_similarity(q, d) for q, d, w in zip(query_hist, data_hist, weights))
                for data_hist in dataset_array
            ]
            for query_hist in query_array
        ])

        max_similarity = np.max(similarity_matrix) if similarity_matrix.size > 0 else 0
        scores.append((file, max_similarity))

    return sorted(scores, key=lambda x: x[1], reverse=True)


# FastAPI endpoint
@app.post("/find-similar-midi/")
async def find_similar_midi(
    query_file: UploadFile,
    dataset_folder: str = Form(...),
    mapper_file: Optional[str] = Form(None)
):
    start_time = time.time()

    dataset_path = os.path.join(UPLOADS_DIR, dataset_folder)
    if not os.path.isdir(dataset_path):
        return JSONResponse(content={"error": "Dataset folder not found"}, status_code=400)

    midi_files = load_midi_files(dataset_path)
    window_size_beats = 40
    step_size_beats = 8

    dataset_features = process_dataset_final(midi_files, window_size_beats, step_size_beats)

    query_path = os.path.join(UPLOADS_DIR, "query.mid")
    with open(query_path, "wb") as f:
        f.write(await query_file.read())

    top_matches = retrieve_similar_files_with_rank(query_path, dataset_features, weights=[0.5, 0.3, 0.2], window_size=window_size_beats, step_size=step_size_beats)

    results = [{"filename": file, "similarity": score * 100} for file, score in top_matches if 0.5 <= score <= 1.0]

    if mapper_file:
        mapper_path = os.path.join(UPLOADS_DIR, mapper_file)
        if os.path.isfile(mapper_path):
            with open(mapper_path, "r", encoding="utf-8") as f:
                mapper = json.load(f)
            results = [
                {
                    **result,
                    "mapped_audio_name": next((entry["audio_name"] for entry in mapper if entry["audio_file"] == result["filename"]), None),
                    "pictureFile": next((entry["pic_name"] for entry in mapper if entry["audio_file"] == result["filename"]), None),
                }
                for result in results
            ]

    end_time = time.time()
    return JSONResponse(content={"results": results, "execution_time": end_time - start_time})
