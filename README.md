# Caffeine Sensitivity Calculator

A web application to calculate your safe caffeine intake based on personal factors like age, weight, gender, and sensitivity. Easily track your daily caffeine consumption and avoid overdose with science-backed recommendations.

## Features
- Calculates safe caffeine intake personalized to user inputs
- Unit conversion (ml/oz, kg/lbs)
- Input fields for age, gender, weight, pregnancy status, and sensitivity
- Two-panel responsive layout (Bootstrap grid)
- Search functionality for caffeine content in beverages
- Local storage for user preferences
- Modern UI with custom logo and favicon

## Folder Structure
```
Caffeine/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── images/
│   │   └── favicon.ico, image.svg
│   └── js/
│       └── script.js
├── pages/
│   ├── caffeine-science.html
│   ├── overdose-symptoms.html
│   └── health-advice.html
├── seo/
│   ├── sitemap.xml
│   └── robots.txt
├── caf_src.json
├── index.html
├── .gitignore
└── README.md
```

## Setup & Usage
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Caffeine
   ```
2. **Open `index.html` in your browser** (no build step required)
3. **For deployment:**
   - Upload all files to your web server or VPS
   - Ensure the folder structure is preserved
   - For SEO, serve `sitemap.xml` and `robots.txt` from the root or `/seo/` as needed

## Technologies Used
- HTML5, CSS3, JavaScript (Vanilla)
- [Bootstrap 5](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/)

## Credits
- Developed by IUshakovsky
- Icons and fonts from [Font Awesome](https://fontawesome.com/) and [Google Fonts](https://fonts.google.com/)

## License
MIT License
