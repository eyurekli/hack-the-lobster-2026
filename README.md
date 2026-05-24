## Hack The Lobster

Hack the Lobster is a website shows the suitability of three regions to be lobster habitats based on their temperature in a given year, showing how the lobsters will migrate from one region to another. 

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

## (JUPITER SECTION)

- Once the sst_regions.csv file has been created, run suitability_score.py. This will use the CSV file to create habitat_suitability.json, which is the data that the website uses. 

- If npm isn't installed, run "npm install" in your terminal.
- Run "npm run dev".
- Click on the local host link provided at the end of this process, and the website will be opened.
