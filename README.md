# CityMaster

CityMaster is an open-source geographic serious game designed to help users master the topology of cities (streets, neighborhoods, and points of interest) through three interactive game modes.

## Architecture

This project is built using vanilla JavaScript, standard HTML5/CSS3, and modern OOP principles, following the MVC (Model-View-Controller) architecture.

- **Models**: Manage domain entities and business rules (e.g., scoring, game session state, map streets).
- **Views**: Handle visual presentation and capture raw user input events.
- **Controllers**: Mediate between models and views.
- **Services**: Connect to external APIs (OpenStreetMap Overpass, Mapillary) and wrap libraries like Turf.js.

## Getting Started

1. Clone the repository.
2. Provide your credentials by copying `.env.example` to `.env` and configuring your API tokens.
3. Open `public/index.html` in a web browser, or serve the directory using a web server.
