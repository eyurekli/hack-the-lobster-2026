## Blue Lobster

Blue Lobster is a website shows the suitability of three regions to be lobster habitats based on their temperature in a given year, showing how the lobsters will migrate from one region to another. 

## Access Instructions

- To access the website, simply click the following link: hack-the-blue-lobster.web.app

## Usage 

The temperature of each location in each year can be investigated using the interface on the bottom of the webpage - the year can be changed either using the slider or by typing in a year.

Additionally, the year can be gradually increased from the year selected using the play button (and this increase can be paused with the same button).

Each region can be clicked on either on the map itself or on the sidebar to show the projected temperature for each year.

The animation of the lobsters swimming between regions can be disabled using the migration flow button.

## Developer Set-Up Instructions

- Create a venv and select that venv as your kernel after installing requirments:

    python3 -m venv venv
    source venv/bin/activate        # Windows: venv\Scripts\activate
    pip install -r requirements.txt

## Data Pipeline

The data pipeline (`datawrangler.ipynb`) downloads 44 years of daily sea surface temperature readings from NOAA and processes them into a clean CSV used by the habitat suitability model.

The source is NOAA's OISST v2.1 dataset — a global daily satellite temperature record from 1982 onwards. Each day is a separate NetCDF file (~9 MB). The pipeline extracts regional mean SSTs, then deletes the file immediately so disk usage stays at ~9 MB at any point.

It runs in three progressive phases so the suitability model can start working with real data quickly:

- **Annual** — one file per year (~45 downloads, done in minutes)
- **Monthly** — one file per month across all years (~540 downloads total)
- **Daily** — every remaining day, breadth-first so coverage stays uniform across all years regardless of when you stop

**Output:** `Data/sst_regions.csv` — columns: `region`, `year`, `mean_temp`

### Running the Pipeline

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
jupyter lab
# Open datawrangler.ipynb and run all cells
```

**Interrupting and resuming:** the pipeline checkpoints to `Data/sst_daily_checkpoint.csv` every ~10 files. To resume after an interrupt, re-run cells 2, 4, and 5 — already-processed dates are skipped automatically.

**Getting a mid-run CSV:** run the last two cells at any point. They aggregate the checkpoint into annual means and overwrite `sst_regions.csv`.

- Once the sst_regions.csv file has been created, run suitability_score.py. This will use the CSV file to create habitat_suitability.json, which is the data that the website uses. 

- If npm isn't installed, run "npm install" in your terminal.
- Run "npm run dev".
- Click on the local host link provided at the end of this process, and the website will be opened.
