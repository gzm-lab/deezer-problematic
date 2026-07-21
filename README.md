# Deezer Problematic

Analyze Deezer playlists to count tracks made by specific artists.

## Description

This project provides a tool to:
1. Fetch a Deezer playlist by URL
2. Read a list of artist names from a CSV file
3. Count how many tracks in the playlist are made by those artists

## Features

- Uses the official Deezer API (no authentication required for public playlists)
- Handles paginated API responses automatically
- Case-insensitive artist matching
- Displays detailed statistics

## Installation

1. Clone the repository:
```bash
git clone https://github.com/gzm-lab/deezer-problematic.git
cd deezer-problematic
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Command Line

```bash
python main.py <PLAYLIST_URL> <CSV_FILE>
```

**Arguments:**
- `PLAYLIST_URL`: Deezer playlist URL (e.g., `https://www.deezer.com/playlist/123456789`)
- `CSV_FILE`: Path to CSV file containing artist names (first column only)

**Example:**
```bash
python main.py "https://www.deezer.com/playlist/1234567890" artists.csv
```

### CSV File Format

Create a CSV file with artist names in the first column:

```csv
artist_name
The Beatles
Pink Floyd
Led Zeppelin
```

Or with a header:

```csv
Artist
The Beatles
Pink Floyd
Led Zeppelin
```

### Python Module

You can also use this as a Python module:

```python
from main import main

# Count tracks
count = main(
    playlist_url="https://www.deezer.com/playlist/1234567890",
    csv_file="artists.csv"
)
print(f"Found {count} matching tracks")
```

## Output

The script displays:
- Number of unique artists loaded from CSV
- Playlist ID extracted from URL
- Total tracks fetched from playlist
- Number of matching tracks
- Percentage of playlist made by specified artists

Example output:
```
Loading artists from CSV: artists.csv
✓ Loaded 15 unique artists

Fetching playlist from URL: https://www.deezer.com/playlist/1234567890
✓ Playlist ID: 1234567890
✓ Fetched 50 tracks from playlist

==================================================
Results:
  Total tracks in playlist: 50
  Tracks from specified artists: 12
  Percentage: 24.0%
==================================================

✓ Found 12 matching tracks
```

## API Used

- **Deezer API**: Public API at `https://api.deezer.com`
  - No authentication required for public playlists
  - Rate limits apply (see [Deezer API documentation](https://developers.deezer.com/api))

## Requirements

- Python 3.7+
- requests
- pandas
- python-dotenv (for future enhancements)

## Error Handling

The script handles common errors:
- Invalid playlist URLs
- Non-existent CSV files
- Empty CSV files
- API request failures
- Network issues

## License

MIT

## Author

Created by gzm-lab
