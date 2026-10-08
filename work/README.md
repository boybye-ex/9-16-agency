# Portfolio / Work Directory

This folder contains all photo shoots displayed on the website. The gallery is data-driven: both the homepage preview and the full `/work.html` page read from JSON files here.

## How to Add a New Shoot

**Adding a shoot requires only 2 steps:**

### Step 1: Create the shoot folder with images + manifest

```
/work/your-shoot-name/
├── image-01.jpg
├── image-02.jpg
├── ...
└── manifest.json
```

The `manifest.json` should follow this structure:

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
    },
    {
      "file": "image-02.jpg",
      "alt": "Another descriptive alt text",
      "look": "Another Category",
      "featured": false,
      "featured_order": null
    }
  ]
}
```

**Fields:**
- `title`: Shoot name shown in the gallery header
- `subtitle`: Brief description
- `folder`: Must match the folder name exactly
- `images`: Array of all images in the shoot
  - `file`: Image filename
  - `alt`: Alt text for accessibility (required)
  - `look`: Category/look name for filtering on the work page
  - `featured`: Set to `true` for images to show on the homepage preview
  - `featured_order`: Number for homepage display order (1 = first); `null` for non-featured

### Step 2: Add ONE line to `/work/shoots.json`

```json
{
  "shoots": [
    {
      "folder": "one-piece-three-looks",
      "order": 1,
      "homepage_featured_cap": 4
    },
    {
      "folder": "poedagar-watch",
      "order": 2,
      "homepage_featured_cap": 2
    },
    {
      "folder": "your-new-shoot",
      "order": 3,
      "homepage_featured_cap": 2
    }
  ]
}
```

**Fields:**
- `folder`: Must match the shoot folder name exactly
- `order`: Display order on the work page (lower = first)
- `homepage_featured_cap`: Maximum number of featured images from this shoot to show on the homepage preview (controls the mix across shoots)

That's it! Commit and push — the site will automatically display the new shoot.

---

## How the Homepage Preview Works

The homepage "Our Work" section:
1. Loads all shoots from `shoots.json` in order
2. From each shoot, takes up to `homepage_featured_cap` featured images (sorted by `featured_order`)
3. Shows the first 6 images initially
4. "See More" reveals additional featured images
5. "View Full Gallery" links to `/work.html`

**Example:** With the current config:
- One Piece, Three Looks: cap 4 → shows images with featured_order 1, 2, 3, 4
- Poedagar Watch: cap 2 → shows images with featured_order 1, 2
- Total: 6 images on homepage

---

## Tips

- **Featured images**: Choose the most visually striking shots. Mark them `featured: true` and number with `featured_order`.
- **Homepage cap**: Use `homepage_featured_cap` to control how many images each shoot contributes to the homepage (keeps the mix balanced).
- **Alt text**: Write descriptive alt text (e.g., "Model in white blazer with gold teardrop earrings" not just "photo 1").
- **Image optimization**: Keep images under 300KB for fast loading. Tools like [Squoosh](https://squoosh.app/) can help.
- **Aspect ratio**: Images display in 9:16 vertical format. Portrait/vertical shots work best.

---

## Current Shoots

| Folder | Title | Images | Homepage Cap |
|--------|-------|--------|--------------|
| `one-piece-three-looks` | One Piece, Three Looks (Earrings Campaign) | 17 | 3 |
| `poedagar-watch` | Poedagar Watch (Product Shoot) | 9 | 2 |
| `elysian-perfume` | Elysian by French Avenue (Perfume Shoot) | 3 | 1 |
