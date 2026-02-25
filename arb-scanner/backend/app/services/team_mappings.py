"""Comprehensive team nickname <-> city/location mappings for North American pro sports.

Covers NBA (30), NFL (32), MLB (30), NHL (32), MLS (30), WNBA (13 in 2025, 15 in 2026).
Each league dict maps in BOTH directions:
    nickname -> city    ("Thunder" -> "Oklahoma City")
    city     -> nickname ("Oklahoma City" -> "Thunder")

For cities with multiple teams in the same league, the city key maps to a LIST.
For single-team cities, it maps to a single string.

Also provides:
  ABBREVIATIONS  -- common 2-3 letter codes used in prediction markets / sportsbooks
  abbrev_to_full -- helper to expand "OKC" -> ("Oklahoma City", "Thunder")
"""

from __future__ import annotations

# ============================================================================
# NBA  (30 teams, 2025-26 season)
# ============================================================================
NBA_TEAMS: dict[str, str | list[str]] = {
    # --- Eastern Conference ---
    # Atlantic
    "Celtics": "Boston",
    "Nets": "Brooklyn",
    "Knicks": "New York",
    "76ers": "Philadelphia",
    "Raptors": "Toronto",
    # Central
    "Bulls": "Chicago",
    "Cavaliers": "Cleveland",
    "Pistons": "Detroit",
    "Pacers": "Indiana",
    "Bucks": "Milwaukee",
    # Southeast
    "Hawks": "Atlanta",
    "Hornets": "Charlotte",
    "Heat": "Miami",
    "Magic": "Orlando",
    "Wizards": "Washington",
    # --- Western Conference ---
    # Northwest
    "Nuggets": "Denver",
    "Timberwolves": "Minnesota",
    "Thunder": "Oklahoma City",
    "Trail Blazers": "Portland",
    "Jazz": "Utah",
    # Pacific
    "Warriors": "Golden State",
    "Clippers": "Los Angeles",
    "Lakers": "Los Angeles",
    "Kings": "Sacramento",
    "Suns": "Phoenix",
    # Southwest
    "Mavericks": "Dallas",
    "Rockets": "Houston",
    "Grizzlies": "Memphis",
    "Spurs": "San Antonio",
    "Pelicans": "New Orleans",
    # --- Reverse: city -> nickname ---
    "Atlanta": "Hawks",
    "Boston": "Celtics",
    "Brooklyn": "Nets",
    "Charlotte": "Hornets",
    "Chicago": "Bulls",
    "Cleveland": "Cavaliers",
    "Dallas": "Mavericks",
    "Denver": "Nuggets",
    "Detroit": "Pistons",
    "Golden State": "Warriors",
    "Houston": "Rockets",
    "Indiana": "Pacers",
    "Los Angeles": ["Lakers", "Clippers"],  # Two NBA teams
    "Memphis": "Grizzlies",
    "Miami": "Heat",
    "Milwaukee": "Bucks",
    "Minnesota": "Timberwolves",
    "New Orleans": "Pelicans",
    "New York": "Knicks",  # Note: Nets use "Brooklyn"
    "Oklahoma City": "Thunder",
    "Orlando": "Magic",
    "Philadelphia": "76ers",
    "Phoenix": "Suns",
    "Portland": "Trail Blazers",
    "Sacramento": "Kings",
    "San Antonio": "Spurs",
    "Toronto": "Raptors",
    "Utah": "Jazz",
    "Washington": "Wizards",
}


# ============================================================================
# NFL  (32 teams, 2025-26 season)
# ============================================================================
NFL_TEAMS: dict[str, str | list[str]] = {
    # --- AFC ---
    # AFC East
    "Bills": "Buffalo",
    "Dolphins": "Miami",
    "Patriots": "New England",
    "Jets": "New York",
    # AFC North
    "Ravens": "Baltimore",
    "Bengals": "Cincinnati",
    "Browns": "Cleveland",
    "Steelers": "Pittsburgh",
    # AFC South
    "Texans": "Houston",
    "Colts": "Indianapolis",
    "Jaguars": "Jacksonville",
    "Titans": "Tennessee",
    # AFC West
    "Broncos": "Denver",
    "Chiefs": "Kansas City",
    "Raiders": "Las Vegas",
    "Chargers": "Los Angeles",
    # --- NFC ---
    # NFC East
    "Cowboys": "Dallas",
    "Giants": "New York",
    "Eagles": "Philadelphia",
    "Commanders": "Washington",
    # NFC North
    "Bears": "Chicago",
    "Lions": "Detroit",
    "Packers": "Green Bay",
    "Vikings": "Minnesota",
    # NFC South
    "Falcons": "Atlanta",
    "Panthers": "Carolina",
    "Saints": "New Orleans",
    "Buccaneers": "Tampa Bay",
    # NFC West
    "Cardinals": "Arizona",
    "Rams": "Los Angeles",
    "49ers": "San Francisco",
    "Seahawks": "Seattle",
    # --- Reverse: city -> nickname ---
    "Arizona": "Cardinals",
    "Atlanta": "Falcons",
    "Baltimore": "Ravens",
    "Buffalo": "Bills",
    "Carolina": "Panthers",
    "Chicago": "Bears",
    "Cincinnati": "Bengals",
    "Cleveland": "Browns",
    "Dallas": "Cowboys",
    "Denver": "Broncos",
    "Detroit": "Lions",
    "Green Bay": "Packers",
    "Houston": "Texans",
    "Indianapolis": "Colts",
    "Jacksonville": "Jaguars",
    "Kansas City": "Chiefs",
    "Las Vegas": "Raiders",
    "Los Angeles": ["Rams", "Chargers"],  # Two NFL teams
    "Miami": "Dolphins",
    "Minnesota": "Vikings",
    "New England": "Patriots",
    "New Orleans": "Saints",
    "New York": ["Giants", "Jets"],  # Two NFL teams
    "Philadelphia": "Eagles",
    "Pittsburgh": "Steelers",
    "San Francisco": "49ers",
    "Seattle": "Seahawks",
    "Tampa Bay": "Buccaneers",
    "Tennessee": "Titans",
    "Washington": "Commanders",
}


# ============================================================================
# MLB  (30 teams, 2025 season)
# Note: Athletics dropped "Oakland" in 2025, playing in Sacramento 2025-2027
#       before moving to Las Vegas in 2028.
# ============================================================================
MLB_TEAMS: dict[str, str | list[str]] = {
    # --- American League ---
    # AL East
    "Orioles": "Baltimore",
    "Red Sox": "Boston",
    "Yankees": "New York",
    "Rays": "Tampa Bay",
    "Blue Jays": "Toronto",
    # AL Central
    "White Sox": "Chicago",
    "Guardians": "Cleveland",
    "Tigers": "Detroit",
    "Royals": "Kansas City",
    "Twins": "Minnesota",
    # AL West
    "Astros": "Houston",
    "Angels": "Los Angeles",
    "Athletics": "Sacramento",  # Dropped "Oakland" 2025; Sacramento 2025-27; Las Vegas 2028+
    "Mariners": "Seattle",
    "Rangers": "Texas",
    # --- National League ---
    # NL East
    "Braves": "Atlanta",
    "Marlins": "Miami",
    "Mets": "New York",
    "Phillies": "Philadelphia",
    "Nationals": "Washington",
    # NL Central
    "Cubs": "Chicago",
    "Reds": "Cincinnati",
    "Brewers": "Milwaukee",
    "Pirates": "Pittsburgh",
    "Cardinals": "St. Louis",
    # NL West
    "Diamondbacks": "Arizona",
    "Rockies": "Colorado",
    "Dodgers": "Los Angeles",
    "Padres": "San Diego",
    "Giants": "San Francisco",
    # --- Reverse: city -> nickname ---
    "Arizona": "Diamondbacks",
    "Atlanta": "Braves",
    "Baltimore": "Orioles",
    "Boston": "Red Sox",
    "Chicago": ["Cubs", "White Sox"],  # Two MLB teams
    "Cincinnati": "Reds",
    "Cleveland": "Guardians",
    "Colorado": "Rockies",
    "Detroit": "Tigers",
    "Houston": "Astros",
    "Kansas City": "Royals",
    "Los Angeles": ["Dodgers", "Angels"],  # Two MLB teams
    "Miami": "Marlins",
    "Milwaukee": "Brewers",
    "Minnesota": "Twins",
    "New York": ["Yankees", "Mets"],  # Two MLB teams
    "Philadelphia": "Phillies",
    "Pittsburgh": "Pirates",
    "Sacramento": "Athletics",
    "San Diego": "Padres",
    "San Francisco": "Giants",
    "Seattle": "Mariners",
    "St. Louis": "Cardinals",
    "Tampa Bay": "Rays",
    "Texas": "Rangers",
    "Toronto": "Blue Jays",
    "Washington": "Nationals",
}


# ============================================================================
# NHL  (32 teams, 2025-26 season)
# Note: Utah Mammoth officially named May 2025 (formerly Utah Hockey Club).
# ============================================================================
NHL_TEAMS: dict[str, str | list[str]] = {
    # --- Eastern Conference ---
    # Atlantic
    "Bruins": "Boston",
    "Sabres": "Buffalo",
    "Red Wings": "Detroit",
    "Panthers": "Florida",
    "Canadiens": "Montreal",
    "Senators": "Ottawa",
    "Lightning": "Tampa Bay",
    "Maple Leafs": "Toronto",
    # Metropolitan
    "Hurricanes": "Carolina",
    "Blue Jackets": "Columbus",
    "Devils": "New Jersey",
    "Islanders": "New York",
    "Rangers": "New York",
    "Flyers": "Philadelphia",
    "Penguins": "Pittsburgh",
    "Capitals": "Washington",
    # --- Western Conference ---
    # Central
    "Blackhawks": "Chicago",
    "Avalanche": "Colorado",
    "Stars": "Dallas",
    "Wild": "Minnesota",
    "Predators": "Nashville",
    "Blues": "St. Louis",
    "Mammoth": "Utah",
    "Jets": "Winnipeg",
    # Pacific
    "Ducks": "Anaheim",
    "Flames": "Calgary",
    "Oilers": "Edmonton",
    "Kings": "Los Angeles",
    "Sharks": "San Jose",
    "Kraken": "Seattle",
    "Canucks": "Vancouver",
    "Golden Knights": "Vegas",
    # --- Reverse: city -> nickname ---
    "Anaheim": "Ducks",
    "Boston": "Bruins",
    "Buffalo": "Sabres",
    "Calgary": "Flames",
    "Carolina": "Hurricanes",
    "Chicago": "Blackhawks",
    "Colorado": "Avalanche",
    "Columbus": "Blue Jackets",
    "Dallas": "Stars",
    "Detroit": "Red Wings",
    "Edmonton": "Oilers",
    "Florida": "Panthers",
    "Los Angeles": "Kings",
    "Minnesota": "Wild",
    "Montreal": "Canadiens",
    "Nashville": "Predators",
    "New Jersey": "Devils",
    "New York": ["Rangers", "Islanders"],  # Two NHL teams
    "Ottawa": "Senators",
    "Philadelphia": "Flyers",
    "Pittsburgh": "Penguins",
    "San Jose": "Sharks",
    "Seattle": "Kraken",
    "St. Louis": "Blues",
    "Tampa Bay": "Lightning",
    "Toronto": "Maple Leafs",
    "Utah": "Mammoth",
    "Vancouver": "Canucks",
    "Vegas": "Golden Knights",
    "Washington": "Capitals",
    "Winnipeg": "Jets",
}


# ============================================================================
# MLS  (30 teams, 2025 season — San Diego FC expansion)
# ============================================================================
MLS_TEAMS: dict[str, str | list[str]] = {
    # --- Eastern Conference ---
    "Atlanta United": "Atlanta",
    "Charlotte FC": "Charlotte",
    "Chicago Fire": "Chicago",
    "FC Cincinnati": "Cincinnati",
    "Columbus Crew": "Columbus",
    "D.C. United": "Washington",
    "Inter Miami": "Miami",
    "CF Montreal": "Montreal",
    "Nashville SC": "Nashville",
    "New England Revolution": "New England",
    "New York City FC": "New York",
    "New York Red Bulls": "New York",
    "Orlando City": "Orlando",
    "Philadelphia Union": "Philadelphia",
    "Toronto FC": "Toronto",
    # --- Western Conference ---
    "Austin FC": "Austin",
    "Colorado Rapids": "Colorado",
    "FC Dallas": "Dallas",
    "Houston Dynamo": "Houston",
    "LA Galaxy": "Los Angeles",
    "LAFC": "Los Angeles",
    "Minnesota United": "Minnesota",
    "Portland Timbers": "Portland",
    "Real Salt Lake": "Salt Lake",
    "San Diego FC": "San Diego",
    "San Jose Earthquakes": "San Jose",
    "Seattle Sounders": "Seattle",
    "Sporting Kansas City": "Kansas City",
    "St. Louis City SC": "St. Louis",
    "Vancouver Whitecaps": "Vancouver",
    # --- Reverse: city -> team name ---
    "Atlanta": "Atlanta United",
    "Austin": "Austin FC",
    "Charlotte": "Charlotte FC",
    "Chicago": "Chicago Fire",
    "Cincinnati": "FC Cincinnati",
    "Colorado": "Colorado Rapids",
    "Columbus": "Columbus Crew",
    "Dallas": "FC Dallas",
    "Houston": "Houston Dynamo",
    "Kansas City": "Sporting Kansas City",
    "Los Angeles": ["LA Galaxy", "LAFC"],  # Two MLS teams
    "Miami": "Inter Miami",
    "Minnesota": "Minnesota United",
    "Montreal": "CF Montreal",
    "Nashville": "Nashville SC",
    "New England": "New England Revolution",
    "New York": ["New York City FC", "New York Red Bulls"],  # Two MLS teams
    "Orlando": "Orlando City",
    "Philadelphia": "Philadelphia Union",
    "Portland": "Portland Timbers",
    "Salt Lake": "Real Salt Lake",
    "San Diego": "San Diego FC",
    "San Jose": "San Jose Earthquakes",
    "Seattle": "Seattle Sounders",
    "St. Louis": "St. Louis City SC",
    "Toronto": "Toronto FC",
    "Vancouver": "Vancouver Whitecaps",
    "Washington": "D.C. United",
}


# ============================================================================
# WNBA  (13 teams in 2025; 15 in 2026 with Portland Fire + Toronto Tempo)
# ============================================================================
WNBA_TEAMS_2025: dict[str, str | list[str]] = {
    # --- Eastern Conference ---
    "Dream": "Atlanta",
    "Sky": "Chicago",
    "Sun": "Connecticut",
    "Fever": "Indiana",
    "Liberty": "New York",
    "Mystics": "Washington",
    # --- Western Conference ---
    "Wings": "Dallas",
    "Valkyries": "Golden State",
    "Aces": "Las Vegas",
    "Sparks": "Los Angeles",
    "Lynx": "Minnesota",
    "Mercury": "Phoenix",
    "Storm": "Seattle",
    # --- Reverse: city -> nickname ---
    "Atlanta": "Dream",
    "Chicago": "Sky",
    "Connecticut": "Sun",
    "Dallas": "Wings",
    "Golden State": "Valkyries",
    "Indiana": "Fever",
    "Las Vegas": "Aces",
    "Los Angeles": "Sparks",
    "Minnesota": "Lynx",
    "New York": "Liberty",
    "Phoenix": "Mercury",
    "Seattle": "Storm",
    "Washington": "Mystics",
}

# 2026 expansion teams (Portland Fire + Toronto Tempo)
WNBA_TEAMS_2026: dict[str, str | list[str]] = {
    **WNBA_TEAMS_2025,
    "Fire": "Portland",
    "Tempo": "Toronto",
    "Portland": "Fire",
    "Toronto": "Tempo",
}

# Default alias
WNBA_TEAMS = WNBA_TEAMS_2025


# ============================================================================
# ABBREVIATIONS
# Common 2-3 letter codes used in sportsbooks, prediction markets (Kalshi,
# Polymarket, DraftKings, FanDuel, ESPN, etc.)
# Maps abbreviation -> (city, nickname, league)
# ============================================================================
ABBREVIATIONS: dict[str, tuple[str, str, str]] = {
    # ---- NBA ----
    "ATL": ("Atlanta", "Hawks", "NBA"),
    "BOS": ("Boston", "Celtics", "NBA"),
    "BKN": ("Brooklyn", "Nets", "NBA"),
    "CHA": ("Charlotte", "Hornets", "NBA"),
    "CHI": ("Chicago", "Bulls", "NBA"),
    "CLE": ("Cleveland", "Cavaliers", "NBA"),
    "DAL": ("Dallas", "Mavericks", "NBA"),
    "DEN": ("Denver", "Nuggets", "NBA"),
    "DET": ("Detroit", "Pistons", "NBA"),
    "GSW": ("Golden State", "Warriors", "NBA"),
    "GS": ("Golden State", "Warriors", "NBA"),  # alternate
    "HOU": ("Houston", "Rockets", "NBA"),
    "IND": ("Indiana", "Pacers", "NBA"),
    "LAC": ("Los Angeles", "Clippers", "NBA"),
    "LAL": ("Los Angeles", "Lakers", "NBA"),
    "MEM": ("Memphis", "Grizzlies", "NBA"),
    "MIA": ("Miami", "Heat", "NBA"),
    "MIL": ("Milwaukee", "Bucks", "NBA"),
    "MIN": ("Minnesota", "Timberwolves", "NBA"),
    "NOP": ("New Orleans", "Pelicans", "NBA"),
    "NO": ("New Orleans", "Pelicans", "NBA"),  # alternate
    "NYK": ("New York", "Knicks", "NBA"),
    "OKC": ("Oklahoma City", "Thunder", "NBA"),
    "ORL": ("Orlando", "Magic", "NBA"),
    "PHI": ("Philadelphia", "76ers", "NBA"),
    "PHX": ("Phoenix", "Suns", "NBA"),
    "POR": ("Portland", "Trail Blazers", "NBA"),
    "SAC": ("Sacramento", "Kings", "NBA"),
    "SAS": ("San Antonio", "Spurs", "NBA"),
    "SA": ("San Antonio", "Spurs", "NBA"),  # alternate
    "TOR": ("Toronto", "Raptors", "NBA"),
    "UTA": ("Utah", "Jazz", "NBA"),
    "WAS": ("Washington", "Wizards", "NBA"),
    # ---- NFL ----
    "ARI": ("Arizona", "Cardinals", "NFL"),
    # "ATL": already NBA Hawks -- use context to disambiguate
    "BAL": ("Baltimore", "Ravens", "NFL"),
    "BUF": ("Buffalo", "Bills", "NFL"),
    "CAR": ("Carolina", "Panthers", "NFL"),
    # "CHI": already NBA Bulls
    # "CLE": already NBA Cavaliers
    "CIN": ("Cincinnati", "Bengals", "NFL"),
    # "DAL": already NBA Mavericks
    # "DEN": already NBA Nuggets
    # "DET": already NBA Pistons
    "GB": ("Green Bay", "Packers", "NFL"),
    # "HOU": already NBA Rockets
    # "IND": already NBA Pacers
    "JAX": ("Jacksonville", "Jaguars", "NFL"),
    "KC": ("Kansas City", "Chiefs", "NFL"),
    "LV": ("Las Vegas", "Raiders", "NFL"),
    "LAR": ("Los Angeles", "Rams", "NFL"),
    # "LAC": already NBA Clippers
    # "MIA": already NBA Heat
    # "MIN": already NBA Timberwolves
    "NE": ("New England", "Patriots", "NFL"),
    # "NO": already NBA Pelicans
    "NYG": ("New York", "Giants", "NFL"),
    "NYJ": ("New York", "Jets", "NFL"),
    # "PHI": already NBA 76ers
    "PIT": ("Pittsburgh", "Steelers", "NFL"),
    "SF": ("San Francisco", "49ers", "NFL"),
    "SEA": ("Seattle", "Seahawks", "NFL"),
    "TB": ("Tampa Bay", "Buccaneers", "NFL"),
    "TEN": ("Tennessee", "Titans", "NFL"),
    # "WAS": already NBA Wizards
    # ---- MLB ----
    # "ARI": already NFL Cardinals
    # "ATL": already NBA Hawks
    # "BAL": already NFL Ravens
    # "BOS": already NBA Celtics
    "CHC": ("Chicago", "Cubs", "MLB"),
    "CWS": ("Chicago", "White Sox", "MLB"),
    "CHW": ("Chicago", "White Sox", "MLB"),  # alternate
    # "CIN": already NFL Bengals
    # "CLE": already NBA Cavaliers
    "COL": ("Colorado", "Rockies", "MLB"),
    # "DET": already NBA Pistons
    # "HOU": already NBA Rockets
    # "KC": already NFL Chiefs
    "LAA": ("Los Angeles", "Angels", "MLB"),
    "LAD": ("Los Angeles", "Dodgers", "MLB"),
    # "MIA": already NBA Heat
    # "MIL": already NBA Bucks
    # "MIN": already NBA Timberwolves
    "NYM": ("New York", "Mets", "MLB"),
    "NYY": ("New York", "Yankees", "MLB"),
    "OAK": ("Sacramento", "Athletics", "MLB"),  # Historic; team now in Sacramento
    # "PHI": already NBA 76ers
    # "PIT": already NFL Steelers
    "SD": ("San Diego", "Padres", "MLB"),
    # "SF": already NFL 49ers
    # "SEA": already NFL Seahawks
    "STL": ("St. Louis", "Cardinals", "MLB"),
    # "TB": already NFL Buccaneers
    "TEX": ("Texas", "Rangers", "MLB"),
    # "TOR": already NBA Raptors
    # "WAS": already NBA Wizards
    # ---- NHL ----
    "ANA": ("Anaheim", "Ducks", "NHL"),
    # "BOS": already NBA Celtics
    # "BUF": already NFL Bills
    "CGY": ("Calgary", "Flames", "NHL"),
    # "CAR": already NFL Panthers
    # "CHI": already NBA Bulls
    # "COL": already MLB Rockies
    "CBJ": ("Columbus", "Blue Jackets", "NHL"),
    # "DAL": already NBA Mavericks
    # "DET": already NBA Pistons
    "EDM": ("Edmonton", "Oilers", "NHL"),
    "FLA": ("Florida", "Panthers", "NHL"),
    "LAK": ("Los Angeles", "Kings", "NHL"),
    # "MIN": already NBA Timberwolves
    "MTL": ("Montreal", "Canadiens", "NHL"),
    "NSH": ("Nashville", "Predators", "NHL"),
    "NJD": ("New Jersey", "Devils", "NHL"),
    "NYI": ("New York", "Islanders", "NHL"),
    "NYR": ("New York", "Rangers", "NHL"),
    # "OTT": Ottawa Senators
    "OTT": ("Ottawa", "Senators", "NHL"),
    # "PHI": already NBA 76ers
    # "PIT": already NFL Steelers
    "SJS": ("San Jose", "Sharks", "NHL"),
    # "SEA": already NFL Seahawks
    # "STL": already MLB Cardinals
    # "TB": already NFL Buccaneers
    # "TOR": already NBA Raptors
    "UTA": ("Utah", "Mammoth", "NHL"),  # Note: also UTA for Jazz in NBA
    "VAN": ("Vancouver", "Canucks", "NHL"),
    "VGK": ("Vegas", "Golden Knights", "NHL"),
    "WPG": ("Winnipeg", "Jets", "NHL"),
}


# ============================================================================
# UNIFIED ABBREVIATION LOOKUP
# Because many abbreviations are shared across leagues (ATL, BOS, CHI, etc.),
# this maps abbrev -> list of (city, nickname, league) for ALL leagues.
# ============================================================================
FULL_ABBREVIATIONS: dict[str, list[tuple[str, str, str]]] = {
    # --- NBA (30) ---
    "ATL": [("Atlanta", "Hawks", "NBA"), ("Atlanta", "Falcons", "NFL"), ("Atlanta", "Braves", "MLB")],
    "BOS": [("Boston", "Celtics", "NBA"), ("Boston", "Bruins", "NHL"), ("Boston", "Red Sox", "MLB")],
    "BKN": [("Brooklyn", "Nets", "NBA")],
    "CHA": [("Charlotte", "Hornets", "NBA")],
    "CHI": [("Chicago", "Bulls", "NBA"), ("Chicago", "Bears", "NFL"), ("Chicago", "Blackhawks", "NHL")],
    "CLE": [("Cleveland", "Cavaliers", "NBA"), ("Cleveland", "Browns", "NFL"), ("Cleveland", "Guardians", "MLB")],
    "DAL": [("Dallas", "Mavericks", "NBA"), ("Dallas", "Cowboys", "NFL"), ("Dallas", "Stars", "NHL")],
    "DEN": [("Denver", "Nuggets", "NBA"), ("Denver", "Broncos", "NFL")],
    "DET": [("Detroit", "Pistons", "NBA"), ("Detroit", "Lions", "NFL"), ("Detroit", "Tigers", "MLB"), ("Detroit", "Red Wings", "NHL")],
    "GSW": [("Golden State", "Warriors", "NBA")],
    "GS": [("Golden State", "Warriors", "NBA")],
    "HOU": [("Houston", "Rockets", "NBA"), ("Houston", "Texans", "NFL"), ("Houston", "Astros", "MLB")],
    "IND": [("Indiana", "Pacers", "NBA"), ("Indianapolis", "Colts", "NFL")],
    "LAC": [("Los Angeles", "Clippers", "NBA"), ("Los Angeles", "Chargers", "NFL")],
    "LAL": [("Los Angeles", "Lakers", "NBA")],
    "MEM": [("Memphis", "Grizzlies", "NBA")],
    "MIA": [("Miami", "Heat", "NBA"), ("Miami", "Dolphins", "NFL"), ("Miami", "Marlins", "MLB")],
    "MIL": [("Milwaukee", "Bucks", "NBA"), ("Milwaukee", "Brewers", "MLB")],
    "MIN": [("Minnesota", "Timberwolves", "NBA"), ("Minnesota", "Vikings", "NFL"), ("Minnesota", "Twins", "MLB"), ("Minnesota", "Wild", "NHL")],
    "NOP": [("New Orleans", "Pelicans", "NBA")],
    "NO": [("New Orleans", "Pelicans", "NBA"), ("New Orleans", "Saints", "NFL")],
    "NYK": [("New York", "Knicks", "NBA")],
    "OKC": [("Oklahoma City", "Thunder", "NBA")],
    "ORL": [("Orlando", "Magic", "NBA")],
    "PHI": [("Philadelphia", "76ers", "NBA"), ("Philadelphia", "Eagles", "NFL"), ("Philadelphia", "Phillies", "MLB"), ("Philadelphia", "Flyers", "NHL")],
    "PHX": [("Phoenix", "Suns", "NBA"), ("Phoenix", "Mercury", "WNBA")],
    "POR": [("Portland", "Trail Blazers", "NBA")],
    "SAC": [("Sacramento", "Kings", "NBA"), ("Sacramento", "Athletics", "MLB")],
    "SAS": [("San Antonio", "Spurs", "NBA")],
    "SA": [("San Antonio", "Spurs", "NBA")],
    "TOR": [("Toronto", "Raptors", "NBA"), ("Toronto", "Blue Jays", "MLB"), ("Toronto", "Maple Leafs", "NHL")],
    "UTA": [("Utah", "Jazz", "NBA"), ("Utah", "Mammoth", "NHL")],
    "WAS": [("Washington", "Wizards", "NBA"), ("Washington", "Commanders", "NFL"), ("Washington", "Nationals", "MLB"), ("Washington", "Capitals", "NHL")],
    # --- NFL-specific (not already covered) ---
    "ARI": [("Arizona", "Cardinals", "NFL"), ("Arizona", "Diamondbacks", "MLB")],
    "BAL": [("Baltimore", "Ravens", "NFL"), ("Baltimore", "Orioles", "MLB")],
    "BUF": [("Buffalo", "Bills", "NFL"), ("Buffalo", "Sabres", "NHL")],
    "CAR": [("Carolina", "Panthers", "NFL"), ("Carolina", "Hurricanes", "NHL")],
    "CIN": [("Cincinnati", "Bengals", "NFL"), ("Cincinnati", "Reds", "MLB")],
    "GB": [("Green Bay", "Packers", "NFL")],
    "JAX": [("Jacksonville", "Jaguars", "NFL")],
    "KC": [("Kansas City", "Chiefs", "NFL"), ("Kansas City", "Royals", "MLB")],
    "LV": [("Las Vegas", "Raiders", "NFL"), ("Las Vegas", "Aces", "WNBA")],
    "LAR": [("Los Angeles", "Rams", "NFL")],
    "NE": [("New England", "Patriots", "NFL")],
    "NYG": [("New York", "Giants", "NFL")],
    "NYJ": [("New York", "Jets", "NFL")],
    "PIT": [("Pittsburgh", "Steelers", "NFL"), ("Pittsburgh", "Pirates", "MLB"), ("Pittsburgh", "Penguins", "NHL")],
    "SF": [("San Francisco", "49ers", "NFL"), ("San Francisco", "Giants", "MLB")],
    "SEA": [("Seattle", "Seahawks", "NFL"), ("Seattle", "Mariners", "MLB"), ("Seattle", "Kraken", "NHL")],
    "TB": [("Tampa Bay", "Buccaneers", "NFL"), ("Tampa Bay", "Rays", "MLB"), ("Tampa Bay", "Lightning", "NHL")],
    "TEN": [("Tennessee", "Titans", "NFL")],
    # --- MLB-specific (not already covered) ---
    "CHC": [("Chicago", "Cubs", "MLB")],
    "CWS": [("Chicago", "White Sox", "MLB")],
    "CHW": [("Chicago", "White Sox", "MLB")],
    "COL": [("Colorado", "Rockies", "MLB"), ("Colorado", "Avalanche", "NHL")],
    "LAA": [("Los Angeles", "Angels", "MLB")],
    "LAD": [("Los Angeles", "Dodgers", "MLB")],
    "NYM": [("New York", "Mets", "MLB")],
    "NYY": [("New York", "Yankees", "MLB")],
    "OAK": [("Sacramento", "Athletics", "MLB")],
    "SD": [("San Diego", "Padres", "MLB")],
    "STL": [("St. Louis", "Cardinals", "MLB"), ("St. Louis", "Blues", "NHL")],
    "TEX": [("Texas", "Rangers", "MLB")],
    # --- NHL-specific (not already covered) ---
    "ANA": [("Anaheim", "Ducks", "NHL")],
    "CGY": [("Calgary", "Flames", "NHL")],
    "CBJ": [("Columbus", "Blue Jackets", "NHL")],
    "EDM": [("Edmonton", "Oilers", "NHL")],
    "FLA": [("Florida", "Panthers", "NHL")],
    "LAK": [("Los Angeles", "Kings", "NHL")],
    "MTL": [("Montreal", "Canadiens", "NHL")],
    "NSH": [("Nashville", "Predators", "NHL")],
    "NJD": [("New Jersey", "Devils", "NHL")],
    "NYI": [("New York", "Islanders", "NHL")],
    "NYR": [("New York", "Rangers", "NHL")],
    "OTT": [("Ottawa", "Senators", "NHL")],
    "SJS": [("San Jose", "Sharks", "NHL")],
    "VAN": [("Vancouver", "Canucks", "NHL")],
    "VGK": [("Vegas", "Golden Knights", "NHL")],
    "WPG": [("Winnipeg", "Jets", "NHL")],
}


# ============================================================================
# HELPERS
# ============================================================================

def nickname_to_city(nickname: str, league: str | None = None) -> str | None:
    """Look up city/location for a given team nickname.

    Args:
        nickname: Team nickname (e.g. "Thunder", "Warriors")
        league: Optional league filter ("NBA", "NFL", "MLB", "NHL", "MLS", "WNBA")

    Returns:
        City string, or None if not found.
    """
    league_maps = {
        "NBA": NBA_TEAMS,
        "NFL": NFL_TEAMS,
        "MLB": MLB_TEAMS,
        "NHL": NHL_TEAMS,
        "MLS": MLS_TEAMS,
        "WNBA": WNBA_TEAMS,
    }
    if league:
        m = league_maps.get(league.upper(), {})
        return m.get(nickname) if isinstance(m.get(nickname), str) else None
    # Search all leagues
    for m in league_maps.values():
        val = m.get(nickname)
        if isinstance(val, str):
            return val
    return None


def city_to_nicknames(city: str, league: str | None = None) -> list[str]:
    """Look up all nicknames for a given city/location.

    Args:
        city: City name (e.g. "Los Angeles", "New York")
        league: Optional league filter

    Returns:
        List of nickname strings.
    """
    league_maps = {
        "NBA": NBA_TEAMS,
        "NFL": NFL_TEAMS,
        "MLB": MLB_TEAMS,
        "NHL": NHL_TEAMS,
        "MLS": MLS_TEAMS,
        "WNBA": WNBA_TEAMS,
    }
    results = []
    maps_to_search = (
        {league.upper(): league_maps[league.upper()]}
        if league and league.upper() in league_maps
        else league_maps
    )
    for m in maps_to_search.values():
        val = m.get(city)
        if isinstance(val, list):
            results.extend(val)
        elif isinstance(val, str):
            results.append(val)
    return results


def abbrev_to_full(abbrev: str, league: str | None = None) -> list[tuple[str, str, str]]:
    """Expand a 2-3 letter abbreviation to (city, nickname, league) tuples.

    Args:
        abbrev: Abbreviation like "OKC", "LAL", "NYG"
        league: Optional league filter

    Returns:
        List of (city, nickname, league) tuples.
    """
    entries = FULL_ABBREVIATIONS.get(abbrev.upper(), [])
    if league:
        return [e for e in entries if e[2] == league.upper()]
    return entries


# ============================================================================
# ALL LEAGUES COMBINED -- flat nickname -> (city, league) for quick lookup
# ============================================================================
ALL_NICKNAME_TO_CITY: dict[str, list[tuple[str, str]]] = {}

def _build_all_nicknames() -> None:
    _league_maps = [
        ("NBA", NBA_TEAMS),
        ("NFL", NFL_TEAMS),
        ("MLB", MLB_TEAMS),
        ("NHL", NHL_TEAMS),
        ("MLS", MLS_TEAMS),
        ("WNBA", WNBA_TEAMS),
    ]
    for league_name, teams in _league_maps:
        for key, val in teams.items():
            # Only process nickname -> city direction (val is a string city)
            if isinstance(val, str) and not any(
                c.islower() for c in key[:1]
            ):
                # Heuristic: nicknames typically start with uppercase
                # cities also start with uppercase, so we check if the value
                # looks like a city (not a nickname) by seeing if the key
                # exists as a value elsewhere. Simpler: just check if key
                # is in the reverse direction by seeing if val maps back.
                city_val = val
                ALL_NICKNAME_TO_CITY.setdefault(key, []).append((city_val, league_name))


_build_all_nicknames()
