# Caffeine Sensitivity Calculator

A Jekyll-powered web application to calculate your safe caffeine intake based on personal factors like age, weight, gender, and sensitivity. Easily track your daily caffeine consumption and avoid overdose with science-backed recommendations.

## Features
- Calculates safe caffeine intake personalized to user inputs
- Unit conversion (ml/oz, kg/lbs)
- Input fields for age, gender, weight, pregnancy status, and sensitivity
- Two-panel responsive layout (Bootstrap grid)
- **Jekyll blog** - Write posts in Markdown, automatically rendered
- Search functionality for caffeine content in beverages
- Local storage for user preferences
- Modern UI with custom logo and favicon

## Folder Structure
```
Caffeine/
├── _includes/          # Reusable components
│   ├── head.html
│   ├── navigation.html
│   ├── footer.html
│   └── scripts.html
├── _layouts/           # Page templates
│   ├── default.html
│   ├── page.html
│   └── post.html       # Blog post template
├── _pages/             # Content pages
│   ├── caffeine-science.html
│   ├── overdose-symptoms.html
│   └── health-advice.html
├── _posts/             # Blog posts (Markdown)
│   ├── 2025-09-30-welcome-to-caffeine-blog.md
│   └── 2025-09-29-coffee-vs-tea-caffeine-content.md
├── blog/               # Blog index page
│   └── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── data/
│   │   └── caf_src.json
│   ├── images/
│   │   └── favicon.ico, image.svg
│   └── js/
│       ├── script.js
│       └── search-index.js
├── pages/              # Original static pages (backup)
├── _config.yml         # Jekyll configuration
├── Gemfile            # Ruby dependencies
├── index.html         # Homepage
├── robots.txt
├── sitemap.xml
├── .gitignore
└── README.md
```

## Setup & Usage

### Prerequisites
- Ruby (2.7 or higher)
- Bundler gem (`gem install bundler`)

### Local Development
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Caffeine
   ```

2. **Install dependencies:**
   ```bash
   bundle install
   ```

3. **Run Jekyll locally:**
   ```bash
   bundle exec jekyll serve
   ```
   Or with live reload:
   ```bash
   bundle exec jekyll serve --livereload
   ```

4. **View the site:**
   Open your browser to `http://localhost:4000`

### Building for Production
```bash
bundle exec jekyll build
```
The static site will be generated in the `_site/` directory.

### Deployment
- **GitHub Pages:** Push to GitHub and enable Pages in repository settings
- **Netlify:** Connect your repository and set build command to `jekyll build`
- **Traditional hosting:** Upload contents of `_site/` directory to your web server

## Technologies Used
- [Jekyll](https://jekyllrb.com/) 4.3 - Static site generator
- HTML5, CSS3, JavaScript (Vanilla)
- [Bootstrap 5](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/)
- Liquid templating engine

## Jekyll Features
- **Layouts:** Reusable page templates in `_layouts/`
- **Includes:** Modular components (header, footer, navigation) in `_includes/`
- **Collections:** Content pages organized in `_pages/`
- **Blog:** Markdown-based blog posts in `_posts/`
- **Configuration:** Site settings in `_config.yml`
- **Front Matter:** YAML metadata for each page

## Writing Blog Posts

See [BLOG_GUIDE.md](BLOG_GUIDE.md) for detailed instructions. Quick start:

1. Create a new file: `_posts/YYYY-MM-DD-title.md`
2. Add front matter:
```yaml
---
layout: post
title: "Your Title"
date: 2025-09-30 12:00:00 +0300
author: "Your Name"
tags: [tag1, tag2]
excerpt: "Short summary"
---
```
3. Write content in Markdown
4. Save and Jekyll automatically generates the blog post page!

## Credits
- Developed by IUshakovsky
- Icons and fonts from [Font Awesome](https://fontawesome.com/) and [Google Fonts](https://fonts.google.com/)

## License
MIT License
