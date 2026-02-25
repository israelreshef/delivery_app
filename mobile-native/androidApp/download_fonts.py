import urllib.request
import os

font_dir = "app/src/main/res/font"
os.makedirs(font_dir, exist_ok=True)

# Direct links to the OFL fonts from a reliable CDN
fonts = {
    "instrument_sans_regular.ttf": "https://github.com/google/fonts/raw/main/ofl/instrumentsans/InstrumentSans-Regular.ttf",
    "instrument_sans_medium.ttf": "https://github.com/google/fonts/raw/main/ofl/instrumentsans/InstrumentSans-Medium.ttf",
    "instrument_sans_semibold.ttf": "https://github.com/google/fonts/raw/main/ofl/instrumentsans/InstrumentSans-SemiBold.ttf",
    "instrument_sans_bold.ttf": "https://github.com/google/fonts/raw/main/ofl/instrumentsans/InstrumentSans-Bold.ttf"
}

import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for filename, url in fonts.items():
    try:
        path = os.path.join(font_dir, filename)
        print(f"Downloading {filename}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open(path, 'wb') as out_file:
            data = response.read() 
            out_file.write(data)
        print(f"Saved {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
