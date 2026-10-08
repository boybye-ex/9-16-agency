# Portfolio / Work Directory

This folder contains all photo shoots displayed on the website. The gallery is data-driven: both the homepage preview and the full `/work.html` page read from JSON files here.

## How to Add a New Shoot

**Adding a shoot requires only two steps: a folder of images plus one line in the index.**

### Step 1: Create the shoot folder with images + manifest

```
/work/your-shoot-name/
├── image-01.jpg
├── image-02.jpg
├── ...
└── manifest.json
```

Use lowercase letters and hyphens for the folder name. Keep images web-optimised (under ~300KB each).

```json
{
  "title": "Your Shoot Title",
  "subtitle": "A short description of the shoot or campaign.",
  "folder": "your-shoot-name",
  "images": [
    {
      "file": "image-01.jpg",
      "alt": "Descriptive alt text for accessibility",
      "look": "Category or Look Name",
      "featured": true,
      "featured_order": 1
    }
  ]
}
```

**Required fields**

- `title` / `subtitle`: shown on the work page
- `folder`: must match the folder name
- `images[]`: `file`, `alt`
- `featured` + `featured_order`: homepage preview picks (1 = first). Use `null` when not featured.

**Optional fields**

- `look`: filter chips on the work page (used by One Piece, Three Looks)
- `fragrance` + shoot-level `fragrance_order`: named sub-sections (used by French Avenue). You can generalise this with `subsection_field` + `subsection_order` on any shoot.
- `width`, `height`, `shape`: real pixel size and a hint (`portrait-9x16`, `portrait-4x5`, `portrait-2x3`, `square`, `landscape`). The grid uses these so mixed shapes are not forced into 9:16 tiles.
- `no_crop`: `true` for posters, collages, or any image whose text/layout must stay intact. These are never cropped in the grid, homepage preview, or lightbox.
- `group` + `group_order`: keep related images as one contiguous block (side by side). Example: two GROW posters, or a six-poster series. Count drives the columns (2-up vs 3-up on desktop).
- `concept`: `true` on the shoot labels every image in that shoot as spec work. `true` on a single image labels just that image. A small “Concept / spec work” badge appears on the tile, homepage preview, and lightbox. Shoot-level concept also adds a line under the title on the work page: “Concept / spec work, not commissioned by the brand.” Use this whenever real brand logos or marks appear in unpaid/spec visuals.

### Step 2: Add one entry to `/work/shoots.json`

```json
{
  "folder": "your-shoot-name",
  "order": 5,
  "homepage_featured_cap": 1
}
```

- `order`: lower numbers appear first on the work page
- `homepage_featured_cap`: how many of this shoot’s featured images show in the initial homepage row. Extra featured images appear after **See More**.

That’s it. Commit and push.

---

## How the Homepage Preview Works

1. Load shoots from `shoots.json` in `order`
2. From each shoot, take up to `homepage_featured_cap` featured images (`featured_order`)
3. Show those as the first row (about 6 tiles total)
4. **See More** reveals remaining featured images from every shoot
5. **View Full Gallery** goes to `/work.html`

**Current mix (6 tiles):** earrings 1, watch 1, French Avenue 2, Golf R 1, Health & Supplements 1.

---

## Current Shoots

| Folder | Title | Images | Homepage cap |
|--------|-------|--------|--------------|
| `one-piece-three-looks` | One Piece, Three Looks | 17 | 1 |
| `poedagar-watch` | Poedagar Watch | 9 | 1 |
| `french-avenue` | French Avenue | 35 | 2 |
| `vw-golf-r` | Volkswagen Golf R | 6 | 1 |
| `health-supplements` | Health & Supplements | 6 | 1 |
